// Capitalizing strings

const formatName = (unformattedName)=>{

    if (!unformattedName) return "";

    let formattedName = unformattedName.trim();

    return formattedName[0].toUpperCase() +
     formattedName.slice(1).toLowerCase();
}

// Blocked Email Domains
const blockedEmailDomains = new Set([
    "10minutemail.com",
    "mailinator.com",
    "yopmail.com",
    "guerrillamail.com",
    "guerrillamail.net",
    "guerrillamail.org",
    "guerrillamail.biz",
    "sharklasers.com",
    "grr.la",
    "maildrop.cc",
    "temp-mail.org",
    "temp-mail.io",
    "throwawaymail.com",
    "mailnesia.com",
    "spamgourmet.com",
    "dropmail.me",
    "dropmail.xyz",
    "emailondeck.com",
    "moakt.com",
    "dispostable.com",
    "tempinbox.com",
    "mytemp.email",
    "tmpmail.org",
    "mailnull.com",
    "getairmail.com",
    "mintemail.com",
    "trashmail.com",
    "fake-mail.net",
    "jetable.org",
    "disposablemail.com",
    "mailcatch.com",
    "spam4.me",
    "bccto.me",
    "chacuo.net",
    "tempail.com",
    "tempmail.email",
    "tempmail.plus",
    "tempmail.ninja",
    "fakemail.net",
    "tempmail.dev"
]);

const isDisposableEmail = (email) => {

    if (!email || typeof email !== "string") {
        return false;
    }

    const trimmedEmail = email.trim().toLowerCase();

    const atIndex = trimmedEmail.lastIndexOf("@");

    if (atIndex === -1) {
        return false;
    }

    const domain = trimmedEmail.slice(atIndex + 1);

    return blockedEmailDomains.has(domain);
};


module.exports = {
    formatName,
    blockedEmailDomains,
    isDisposableEmail
};