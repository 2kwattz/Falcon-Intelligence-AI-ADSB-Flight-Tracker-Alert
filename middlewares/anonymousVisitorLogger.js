const {
    hasAuthenticatedSession,
    recordAnonymousVisitor,
    requestedPublicPage
} = require("../services/anonymousVisitorLogs");

function anonymousVisitorLogger(req, res, next) {
    const page = requestedPublicPage(req);

    if (page && !hasAuthenticatedSession(req)) {
        // Logging is deliberately non-blocking: a Redis issue must never slow
        // down or prevent a public page from loading.
        void recordAnonymousVisitor(req, page);
    }

    next();
}

module.exports = anonymousVisitorLogger;
