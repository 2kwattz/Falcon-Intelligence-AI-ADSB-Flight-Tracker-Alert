/*
 * Standalone Indian military and government aircraft research catalogue.
 *
 * This file is intentionally not imported by the server, dashboard, alert loops,
 * city trackers, or any other application module. Editing it cannot change alert
 * matching or notification behaviour.
 *
 * The 508 confirmed Indian Air Force records from iafData.xlsx are grouped by
 * aircraft type and de-duplicated by six-character Mode-S/ICAO address. Existing
 * non-overlapping government and reported/unconfirmed reference entries are retained.
 * Never infer a missing identity or address.
 */

const masterDataset = {
    "allAircraft": {
        "ALH": [
            {
                "Registration": "IN709",
                "AircraftType": "HAL ALH Dhruv Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F00"
            },
            {
                "Registration": "IN710",
                "AircraftType": "HAL ALH Dhruv Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F01"
            },
            {
                "Registration": "IN711",
                "AircraftType": "HAL ALH Dhruv Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F02"
            },
            {
                "Registration": "IN712",
                "AircraftType": "HAL ALH Dhruv Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F03"
            },
            {
                "Registration": "IN715",
                "AircraftType": "HAL ALH Dhruv Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F06"
            },
            {
                "Registration": "IN716",
                "AircraftType": "HAL ALH Dhruv Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F07"
            },
            {
                "Registration": "IN717",
                "AircraftType": "HAL ALH Dhruv Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F08"
            },
            {
                "Registration": "IN718",
                "AircraftType": "HAL ALH Dhruv Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F09"
            }
        ],
        "HTT40": [
            {
                "Registration": "TSR002",
                "AircraftType": "Hindustan Turbo Trainer-40",
                "TypeCode": "HTT40",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E36"
            }
        ],
        "IL76": [
            {
                "Registration": "K2663",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002D7"
            },
            {
                "Registration": "K2661",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002D5"
            }
        ],
        "Jaguar": [
            {
                "Registration": "JM257",
                "AircraftType": "Jaguar",
                "TypeCode": "JAGR",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "83F257"
            }
        ],
        "LCA": [
            {
                "Registration": "LA5047",
                "AircraftType": "HAL Tejas LCA",
                "TypeCode": "LCA",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "29CBB8"
            }
        ],
        "NonIL78Refuelers": [
            {
                "Registration": "N604MA",
                "AircraftType": "Boeing C-135FR Stratolifter",
                "TypeCode": "K35R",
                "AircraftOperator": "Indian Air Force",
                "HexCode": "A7D72F"
            },
            {
                "Registration": "N679MA",
                "AircraftType": "Boeing C-135FR Stratolifter",
                "TypeCode": "K35R",
                "AircraftOperator": "Indian Air Force",
                "HexCode": "A8FE3B"
            }
        ],
        "AWACS": [
            {
                "Registration": "VTSCO",
                "AircraftType": "AWACS",
                "TypeCode": null,
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8004FD"
            }
        ],
        "Refuelers": [
            {
                "Registration": "N763MA",
                "AircraftType": "Boeing KC-135R",
                "TypeCode": "KC135",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "AA4DC1"
            }
        ],
        "Vintage Flight": [
            {
                "Registration": "VP905",
                "AircraftType": "Douglas DC-3",
                "TypeCode": "DC3",
                "AircraftOperator": "Vintage Flight of the Indian Air Force",
                "HexCode": "800E3D"
            }
        ],
        "Government aircraft": [
            {
                "Registration": "VT-GOG",
                "AircraftType": "Bombardier Challenger 650",
                "TypeCode": "CL60",
                "AircraftOperator": "Government of Gujarat",
                "HexCode": "80138E"
            },
            {
                "Registration": "VT-UPG",
                "AircraftType": "Leonardo AW139",
                "TypeCode": "A139",
                "AircraftOperator": "Government of Uttar Pradesh",
                "HexCode": "801809"
            },
            {
                "Registration": "VT-HYR",
                "AircraftType": "Airbus Helicopters H145",
                "TypeCode": "EC45",
                "AircraftOperator": "Government of Haryana",
                "HexCode": "8016B0"
            }
        ],
        "City alert catalogue records (not independently confirmed)": [
            {
                "Registration": "KJ-3449",
                "AircraftType": "Ilyushin Il-78M",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": null
            },
            {
                "Registration": "KF123",
                "AircraftType": "Mirage 2000",
                "TypeCode": "MIR2",
                "AircraftOperator": "IndianAirForce",
                "HexCode": null
            },
            {
                "Registration": "KF123",
                "AircraftType": "Mirage 2000",
                "TypeCode": "MIR2",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "null"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "000001"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "000000"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "00000"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "800000"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "80000"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "AA2000"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "098658",
                "PredictedReg": "Unknown",
                "PredictedAircraftType": "AWACS",
                "PredictedType": "AWACS",
                "PredictedAircraftOperator": "Unknown"
            }
        ],
        "Reported aircraft identities (not confirmed)": [
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "F2C825",
                "PredictedReg": "Unknown",
                "PredictedAircraftType": "Unknown",
                "PredictedType": "UAV",
                "PredictedAircraftOperator": "Indian Navy"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "000737",
                "PredictedReg": "L3467",
                "PredictedAircraftType": "Gulfstream G100",
                "PredictedType": "ASTR",
                "PredictedAircraftOperator": "Aviation Research Centre (ARC) / R&AW"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "003000",
                "PredictedReg": "IN091",
                "PredictedAircraftType": "Aero L-39",
                "PredictedType": "L39",
                "PredictedAircraftOperator": "Indian DRDO"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "101001",
                "PredictedReg": "BS007/BS025/RB204/RB206",
                "PredictedAircraftType": "Dassault Rafale",
                "PredictedType": "RFAL",
                "PredictedAircraftOperator": "Indian Air Force"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "800853",
                "PredictedReg": "IN327",
                "PredictedAircraftType": "P8i",
                "PredictedType": "P8",
                "PredictedAircraftOperator": "Indian Navy"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "ABCDEF",
                "PredictedReg": "KF123",
                "PredictedAircraftType": "Dassault Mirage 2000",
                "PredictedType": "MIR2",
                "PredictedAircraftOperator": "Indian Air Force"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "758380",
                "PredictedReg": "KT201",
                "PredictedAircraftType": "Dassault Mirage 2000",
                "PredictedType": "MIR2",
                "PredictedAircraftOperator": "Indian Air Force"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "555555",
                "PredictedReg": "Unknown",
                "PredictedAircraftType": "Mi17",
                "PredictedType": "MI17",
                "PredictedAircraftOperator": "Indian Air Force / Indian Army"
            },
            {
                "Registration": "Unknown",
                "AircraftType": "Unknown",
                "TypeCode": "Unknown",
                "AircraftOperator": "Unknown",
                "HexCode": "1BA9BD",
                "PredictedReg": "LT5205",
                "PredictedAircraftType": "LCA Twin Seater",
                "PredictedType": "LCA",
                "PredictedAircraftOperator": "Indian Air Force"
            }
        ],
        "Airbus A321-211": [
            {
                "Registration": "CA-7081",
                "AircraftType": "Airbus A321-211",
                "TypeCode": "A321",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8003C1"
            },
            {
                "Registration": "CA-7082",
                "AircraftType": "Airbus A321-211",
                "TypeCode": "A321",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8003E5"
            },
            {
                "Registration": "CA-7083",
                "AircraftType": "Airbus A321-211",
                "TypeCode": "A321",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8003E6"
            },
            {
                "Registration": "CA-7084",
                "AircraftType": "Airbus A321-211",
                "TypeCode": "A321",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800414"
            },
            {
                "Registration": "CA-7085",
                "AircraftType": "Airbus A321-211",
                "TypeCode": "A321",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800415"
            },
            {
                "Registration": "CA-7086",
                "AircraftType": "Airbus A321-211",
                "TypeCode": "A321",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800440"
            }
        ],
        "Airbus C-295W": [
            {
                "Registration": "CA-7101",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80150B"
            },
            {
                "Registration": "CA-7102",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80151F"
            },
            {
                "Registration": "CA-7103",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801520"
            },
            {
                "Registration": "CA-7104",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801521"
            },
            {
                "Registration": "CA-7105",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801522"
            },
            {
                "Registration": "CA-7106",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8016E5"
            },
            {
                "Registration": "CA-7107",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8016E6"
            },
            {
                "Registration": "CA-7108",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8016E7"
            },
            {
                "Registration": "CA-7109",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8016E8"
            },
            {
                "Registration": "CA-7110",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8016F8"
            },
            {
                "Registration": "CA-7111",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8016F9"
            },
            {
                "Registration": "CA-7112",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8016FA"
            },
            {
                "Registration": "CA-7113",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801714"
            },
            {
                "Registration": "CA-7114",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801715"
            },
            {
                "Registration": "CA-7115",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801716"
            },
            {
                "Registration": "CA-7116",
                "AircraftType": "Airbus C-295W",
                "TypeCode": "C295",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8017AD"
            }
        ],
        "Antonov An-32": [
            {
                "Registration": "K2667",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800DC1"
            },
            {
                "Registration": "K2668",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800338"
            },
            {
                "Registration": "K2670",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80023F"
            },
            {
                "Registration": "K2671",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800217"
            },
            {
                "Registration": "K2672",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800226"
            },
            {
                "Registration": "K2676",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80024D"
            },
            {
                "Registration": "K2677",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800261"
            },
            {
                "Registration": "K2679",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E0C"
            },
            {
                "Registration": "K2680",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800264"
            },
            {
                "Registration": "K2681",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80020B"
            },
            {
                "Registration": "K2682",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80033C"
            },
            {
                "Registration": "K2683",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800222"
            },
            {
                "Registration": "K2684",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80079D"
            },
            {
                "Registration": "K2685",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800204"
            },
            {
                "Registration": "K2686",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800257"
            },
            {
                "Registration": "K2687",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80033A"
            },
            {
                "Registration": "K2689",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800228"
            },
            {
                "Registration": "K2691",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800267"
            },
            {
                "Registration": "K2693",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800DBB"
            },
            {
                "Registration": "K2694",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80020F"
            },
            {
                "Registration": "K2695",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800DC0"
            },
            {
                "Registration": "K2696",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800318"
            },
            {
                "Registration": "K2697",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80079E"
            },
            {
                "Registration": "K2698",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800208"
            },
            {
                "Registration": "K2699",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800205"
            },
            {
                "Registration": "K2701",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800213"
            },
            {
                "Registration": "K2703",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800243"
            },
            {
                "Registration": "K2704",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80031A"
            },
            {
                "Registration": "K2706",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80023A"
            },
            {
                "Registration": "K2707",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80031B"
            },
            {
                "Registration": "K2708",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80031C"
            },
            {
                "Registration": "K2711",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800225"
            },
            {
                "Registration": "K2715",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80025F"
            },
            {
                "Registration": "K2717",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800232"
            },
            {
                "Registration": "K2719",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80031D"
            },
            {
                "Registration": "K2720",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800258"
            },
            {
                "Registration": "K2725",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800237"
            },
            {
                "Registration": "K2726",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800210"
            },
            {
                "Registration": "K2730",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800259"
            },
            {
                "Registration": "K2731",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8003A0"
            },
            {
                "Registration": "K2732",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800265"
            },
            {
                "Registration": "K2733",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800233"
            },
            {
                "Registration": "K2734",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800221"
            },
            {
                "Registration": "K2735",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80023E"
            },
            {
                "Registration": "K2736",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800DBC"
            },
            {
                "Registration": "K2737",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800255"
            },
            {
                "Registration": "K2738",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800244"
            },
            {
                "Registration": "K2740",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80024B"
            },
            {
                "Registration": "K2741",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800230"
            },
            {
                "Registration": "K2742",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800DC4"
            },
            {
                "Registration": "K2744",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800206"
            },
            {
                "Registration": "K2745",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80024E"
            },
            {
                "Registration": "K2747",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800DC3"
            },
            {
                "Registration": "K2749",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800215"
            },
            {
                "Registration": "K2750",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800DC2"
            },
            {
                "Registration": "K2751",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800262"
            },
            {
                "Registration": "K2753",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800253"
            },
            {
                "Registration": "K2754",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800266"
            },
            {
                "Registration": "K2755",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80021E"
            },
            {
                "Registration": "K2756",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800248"
            },
            {
                "Registration": "K2760",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80079C"
            },
            {
                "Registration": "K2762",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800DBD"
            },
            {
                "Registration": "K2764",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8007A1"
            },
            {
                "Registration": "K3056",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800256"
            },
            {
                "Registration": "K3058",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800268"
            },
            {
                "Registration": "K3059",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800216"
            },
            {
                "Registration": "K3060",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80022C"
            },
            {
                "Registration": "K3061",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800229"
            },
            {
                "Registration": "K3063",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80024F"
            },
            {
                "Registration": "K3064",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80020E"
            },
            {
                "Registration": "K3065",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800231"
            },
            {
                "Registration": "K3066",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800212"
            },
            {
                "Registration": "K3067",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80020A"
            },
            {
                "Registration": "K3068",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80021F"
            },
            {
                "Registration": "K3069",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800235"
            },
            {
                "Registration": "K3070",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800239"
            },
            {
                "Registration": "K3071",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80024C"
            },
            {
                "Registration": "K3072",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80021C"
            },
            {
                "Registration": "K3073",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80022D"
            },
            {
                "Registration": "K3074",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80025E"
            },
            {
                "Registration": "KA2670",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800314"
            },
            {
                "Registration": "KA2675",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800DBE"
            },
            {
                "Registration": "KA2676",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800315"
            },
            {
                "Registration": "KA2677",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80062A"
            },
            {
                "Registration": "KA2678",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E0E"
            },
            {
                "Registration": "KA2698",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800602"
            },
            {
                "Registration": "KA2699",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800F24"
            },
            {
                "Registration": "KA2700",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E74"
            },
            {
                "Registration": "KA2703",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E75"
            },
            {
                "Registration": "KA2731",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8007A0"
            },
            {
                "Registration": "KA2732",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801487"
            },
            {
                "Registration": "KA2733",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80079B"
            },
            {
                "Registration": "KA2741",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E72"
            },
            {
                "Registration": "KA2745",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8006B2"
            },
            {
                "Registration": "KA2753",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E70"
            },
            {
                "Registration": "KA2759",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E71"
            },
            {
                "Registration": "KA3058",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801488"
            },
            {
                "Registration": "KA3065",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80148A"
            },
            {
                "Registration": "KA3071",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800F2D"
            },
            {
                "Registration": "KA3072",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E79"
            },
            {
                "Registration": "VUBKB",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800F2A"
            },
            {
                "Registration": "VUBKG",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800F10"
            },
            {
                "Registration": "VUDBB",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800F2B"
            },
            {
                "Registration": "VUDBS",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800F25"
            },
            {
                "Registration": "VUDOK",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800F28"
            },
            {
                "Registration": "VUDOL",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8007A2"
            },
            {
                "Registration": "VUMPB",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800F29"
            },
            {
                "Registration": "VUMPV",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800218"
            },
            {
                "Registration": "VUMPZ",
                "AircraftType": "Antonov An-32",
                "TypeCode": "AN32",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80021B"
            }
        ],
        "Boeing 707-337C": [
            {
                "Registration": "K2899",
                "AircraftType": "Boeing 707-337C",
                "TypeCode": "B703",
                "AircraftOperator": "AviationResearchCentre",
                "HexCode": "8000D6"
            }
        ],
        "Boeing 737-200": [
            {
                "Registration": "K2412",
                "AircraftType": "Boeing 737-200",
                "TypeCode": "B732",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800078"
            },
            {
                "Registration": "K2413",
                "AircraftType": "Boeing 737-200",
                "TypeCode": "B732",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800079"
            },
            {
                "Registration": "K3187",
                "AircraftType": "Boeing 737-200",
                "TypeCode": "B732",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002BB"
            }
        ],
        "Boeing 737-700 BBJ": [
            {
                "Registration": "K5012",
                "AircraftType": "Boeing 737-700 BBJ",
                "TypeCode": "B737",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002F6"
            },
            {
                "Registration": "K5013",
                "AircraftType": "Boeing 737-700 BBJ",
                "TypeCode": "B737",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002F7"
            },
            {
                "Registration": "K5014",
                "AircraftType": "Boeing 737-700 BBJ",
                "TypeCode": "B737",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002FB"
            }
        ],
        "Boeing 777-300ER": [
            {
                "Registration": "K7066",
                "AircraftType": "Boeing 777-300ER",
                "TypeCode": "B77W",
                "AircraftOperator": "GovernmentOfIndia",
                "HexCode": "800585"
            },
            {
                "Registration": "K7067",
                "AircraftType": "Boeing 777-300ER",
                "TypeCode": "B77W",
                "AircraftOperator": "GovernmentOfIndia",
                "HexCode": "800C3D"
            }
        ],
        "Boeing C-17 Globemaster III": [
            {
                "Registration": "CB-8001",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80078E"
            },
            {
                "Registration": "CB-8002",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80078F"
            },
            {
                "Registration": "CB-8003",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800790"
            },
            {
                "Registration": "CB-8004",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800791"
            },
            {
                "Registration": "CB-8005",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800792"
            },
            {
                "Registration": "CB-8006",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800793"
            },
            {
                "Registration": "CB-8007",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800794"
            },
            {
                "Registration": "CB-8008",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800795"
            },
            {
                "Registration": "CB-8009",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800796"
            },
            {
                "Registration": "CB-8010",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800797"
            },
            {
                "Registration": "CB-8011",
                "AircraftType": "Boeing C-17 Globemaster III",
                "TypeCode": "C17",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E63"
            }
        ],
        "Boeing P-8I Neptune": [
            {
                "Registration": "IN320",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80030C"
            },
            {
                "Registration": "IN321",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80030D"
            },
            {
                "Registration": "IN322",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80030E"
            },
            {
                "Registration": "IN323",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80030F"
            },
            {
                "Registration": "IN324",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800310"
            },
            {
                "Registration": "IN325",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800311"
            },
            {
                "Registration": "IN326",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800312"
            },
            {
                "Registration": "IN327",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800313"
            },
            {
                "Registration": "IN328",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E89"
            },
            {
                "Registration": "IN329",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E8A"
            },
            {
                "Registration": "IN330",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E8B"
            },
            {
                "Registration": "IN331",
                "AircraftType": "Boeing P-8I Neptune",
                "TypeCode": "P8",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E8C"
            }
        ],
        "HAL Dornier 228": [
            {
                "Registration": "IN221",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E25"
            },
            {
                "Registration": "IN222",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E26"
            },
            {
                "Registration": "IN223",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E27"
            },
            {
                "Registration": "IN224",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E28"
            },
            {
                "Registration": "IN225",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E29"
            },
            {
                "Registration": "IN227",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E2B"
            },
            {
                "Registration": "IN228",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E54"
            },
            {
                "Registration": "IN229",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E2D"
            },
            {
                "Registration": "IN231",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E2F"
            },
            {
                "Registration": "IN232",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E30"
            },
            {
                "Registration": "IN233",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E31"
            },
            {
                "Registration": "IN234",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E32"
            },
            {
                "Registration": "IN235",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E33"
            },
            {
                "Registration": "IN236",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002C7"
            },
            {
                "Registration": "IN237",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002C8"
            },
            {
                "Registration": "IN238",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002C9"
            },
            {
                "Registration": "IN239",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002CA"
            },
            {
                "Registration": "IN241",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002ED"
            },
            {
                "Registration": "IN242",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002EE"
            },
            {
                "Registration": "IN243",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002EF"
            },
            {
                "Registration": "IN244",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002F8"
            },
            {
                "Registration": "IN245",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002F9"
            },
            {
                "Registration": "IN246",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8002FA"
            },
            {
                "Registration": "IN251",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E3E"
            },
            {
                "Registration": "IN252",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E3F"
            },
            {
                "Registration": "IN253",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E40"
            },
            {
                "Registration": "IN254",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E41"
            },
            {
                "Registration": "IN255",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E65"
            },
            {
                "Registration": "IN256",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E66"
            },
            {
                "Registration": "IN257",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E67"
            },
            {
                "Registration": "IN258",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800E68"
            },
            {
                "Registration": "IN259",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F13"
            },
            {
                "Registration": "IN260",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F14"
            },
            {
                "Registration": "IN261",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F15"
            },
            {
                "Registration": "IN262",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F21"
            },
            {
                "Registration": "CG751",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800694"
            },
            {
                "Registration": "CG752",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800695"
            },
            {
                "Registration": "CG753",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800696"
            },
            {
                "Registration": "CG754",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800697"
            },
            {
                "Registration": "CG755",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800698"
            },
            {
                "Registration": "CG756",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800699"
            },
            {
                "Registration": "CG758",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "80069A"
            },
            {
                "Registration": "CG759",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "80069B"
            },
            {
                "Registration": "CG760",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "80069E"
            },
            {
                "Registration": "CG761",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "80069C"
            },
            {
                "Registration": "CG762",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "80069D"
            },
            {
                "Registration": "CG763",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "80069F"
            },
            {
                "Registration": "CG764",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A0"
            },
            {
                "Registration": "CG765",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A1"
            },
            {
                "Registration": "CG766",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A2"
            },
            {
                "Registration": "CG767",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A3"
            },
            {
                "Registration": "CG768",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A4"
            },
            {
                "Registration": "CG769",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A5"
            },
            {
                "Registration": "CG770",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A6"
            },
            {
                "Registration": "CG771",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A7"
            },
            {
                "Registration": "CG772",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A8"
            },
            {
                "Registration": "CG773",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006A9"
            },
            {
                "Registration": "CG774",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006AA"
            },
            {
                "Registration": "CG775",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8006AB"
            },
            {
                "Registration": "CG776",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800690"
            },
            {
                "Registration": "CG777",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800691"
            },
            {
                "Registration": "CG778",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800692"
            },
            {
                "Registration": "CG779",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800693"
            },
            {
                "Registration": "CG780",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "80031E"
            },
            {
                "Registration": "CG781",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "80031F"
            },
            {
                "Registration": "CG782",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800320"
            },
            {
                "Registration": "CG783",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800321"
            },
            {
                "Registration": "CG784",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800322"
            },
            {
                "Registration": "CG785",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800323"
            },
            {
                "Registration": "CG786",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800324"
            },
            {
                "Registration": "CG787",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800325"
            },
            {
                "Registration": "CG788",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800326"
            },
            {
                "Registration": "CG789",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800327"
            },
            {
                "Registration": "CG790",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800328"
            },
            {
                "Registration": "CG792",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8016F3"
            },
            {
                "Registration": "CG793",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "8016F4"
            },
            {
                "Registration": "HM667",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800269"
            },
            {
                "Registration": "HM668",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80026A"
            },
            {
                "Registration": "HM669",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80026B"
            },
            {
                "Registration": "HM670",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80026C"
            },
            {
                "Registration": "HM671",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80026D"
            },
            {
                "Registration": "HM672",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80026F"
            },
            {
                "Registration": "HM673",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80026E"
            },
            {
                "Registration": "HM674",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800270"
            },
            {
                "Registration": "HM675",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800271"
            },
            {
                "Registration": "HM677",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800273"
            },
            {
                "Registration": "HM678",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800274"
            },
            {
                "Registration": "HM679",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800275"
            },
            {
                "Registration": "HM680",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800276"
            },
            {
                "Registration": "HM681",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800277"
            },
            {
                "Registration": "HM682",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800278"
            },
            {
                "Registration": "HM683",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800279"
            },
            {
                "Registration": "HM684",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80027A"
            },
            {
                "Registration": "KD685",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80027B"
            },
            {
                "Registration": "HM686",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80027C"
            },
            {
                "Registration": "HM687",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80027D"
            },
            {
                "Registration": "HM688",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80027E"
            },
            {
                "Registration": "HM689",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80027F"
            },
            {
                "Registration": "HM690",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800280"
            },
            {
                "Registration": "HM691",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800281"
            },
            {
                "Registration": "HM692",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002C3"
            },
            {
                "Registration": "HM693",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002C4"
            },
            {
                "Registration": "HM694",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002C5"
            },
            {
                "Registration": "HM695",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800300"
            },
            {
                "Registration": "HM696",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800301"
            },
            {
                "Registration": "HM697",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800302"
            },
            {
                "Registration": "HM698",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800303"
            },
            {
                "Registration": "HM699",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800304"
            },
            {
                "Registration": "HM700",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800305"
            },
            {
                "Registration": "HM701",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800306"
            },
            {
                "Registration": "HM702",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800307"
            },
            {
                "Registration": "HM703",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800308"
            },
            {
                "Registration": "HM704",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800309"
            },
            {
                "Registration": "HM705",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80030A"
            },
            {
                "Registration": "HM706",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80030B"
            },
            {
                "Registration": "KD708",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E10"
            },
            {
                "Registration": "KD709",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E11"
            },
            {
                "Registration": "KD710",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E12"
            },
            {
                "Registration": "KD711",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E13"
            },
            {
                "Registration": "KD712",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E14"
            },
            {
                "Registration": "KD713",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E15"
            },
            {
                "Registration": "KD714",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E16"
            },
            {
                "Registration": "KD715",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E17"
            },
            {
                "Registration": "KD716",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E18"
            },
            {
                "Registration": "KD717",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E19"
            },
            {
                "Registration": "KD718",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E1A"
            },
            {
                "Registration": "KD719",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E1B"
            },
            {
                "Registration": "KD720",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E1C"
            },
            {
                "Registration": "KD721",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E1D"
            },
            {
                "Registration": "KD722",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E64"
            },
            {
                "Registration": "KD723",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E69"
            },
            {
                "Registration": "KD724",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801481"
            },
            {
                "Registration": "KD725",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801482"
            },
            {
                "Registration": "KD726",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801483"
            },
            {
                "Registration": "KD727",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801484"
            },
            {
                "Registration": "KD728",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801485"
            },
            {
                "Registration": "KD729",
                "AircraftType": "HAL Dornier 228",
                "TypeCode": "D228",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801486"
            }
        ],
        "HAL Dhruv ALH Mk III": [
            {
                "Registration": "CG860",
                "AircraftType": "HAL Dhruv ALH Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800F18"
            },
            {
                "Registration": "CG863",
                "AircraftType": "HAL Dhruv ALH Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800F1B"
            },
            {
                "Registration": "CG864",
                "AircraftType": "HAL Dhruv ALH Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800F1C"
            },
            {
                "Registration": "CG865",
                "AircraftType": "HAL Dhruv ALH Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800F1D"
            },
            {
                "Registration": "CG866",
                "AircraftType": "HAL Dhruv ALH Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800F1E"
            },
            {
                "Registration": "CG869",
                "AircraftType": "HAL Dhruv ALH Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianCoastGuard",
                "HexCode": "800E51"
            },
            {
                "Registration": "IN714",
                "AircraftType": "HAL Dhruv ALH Mk III",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F05"
            }
        ],
        "Schiebel Camcopter S-100": [
            {
                "Registration": "IN1026",
                "AircraftType": "Schiebel Camcopter S-100",
                "TypeCode": "VFHC",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80151C"
            },
            {
                "Registration": "IN1028",
                "AircraftType": "Schiebel Camcopter S-100",
                "TypeCode": "VFHC",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80151E"
            }
        ],
        "Sikorsky MH-60R Seahawk": [
            {
                "Registration": "IN751",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F2F"
            },
            {
                "Registration": "IN752",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F30"
            },
            {
                "Registration": "IN753",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F31"
            },
            {
                "Registration": "IN754",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F32"
            },
            {
                "Registration": "IN755",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F33"
            },
            {
                "Registration": "IN756",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "800F34"
            },
            {
                "Registration": "IN757",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "801450"
            },
            {
                "Registration": "IN758",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "801474"
            },
            {
                "Registration": "IN759",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "801475"
            },
            {
                "Registration": "IN760",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "801476"
            },
            {
                "Registration": "IN761",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "801477"
            },
            {
                "Registration": "IN762",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "801478"
            },
            {
                "Registration": "IN763",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80150C"
            },
            {
                "Registration": "IN764",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80150D"
            },
            {
                "Registration": "IN765",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80150E"
            },
            {
                "Registration": "IN766",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "80150F"
            },
            {
                "Registration": "IN767",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "801510"
            },
            {
                "Registration": "IN768",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "801511"
            },
            {
                "Registration": "IN769",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8016EB"
            },
            {
                "Registration": "IN770",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8016EC"
            },
            {
                "Registration": "IN771",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8016ED"
            },
            {
                "Registration": "IN772",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8016EE"
            },
            {
                "Registration": "IN773",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8016EF"
            },
            {
                "Registration": "IN774",
                "AircraftType": "Sikorsky MH-60R Seahawk",
                "TypeCode": "H60",
                "AircraftOperator": "IndianNavy",
                "HexCode": "8016F0"
            }
        ],
        "Bombardier Global 5000": [
            {
                "Registration": "GB8001",
                "AircraftType": "Bombardier Global 5000",
                "TypeCode": "GL5T",
                "AircraftOperator": "AviationResearchCentre",
                "HexCode": "800E03"
            },
            {
                "Registration": "GB8002",
                "AircraftType": "Bombardier Global 5000",
                "TypeCode": "GL5T",
                "AircraftOperator": "AviationResearchCentre",
                "HexCode": "800E04"
            }
        ],
        "Embraer ERJ-145SM Netra": [
            {
                "Registration": "KW3554",
                "AircraftType": "Embraer ERJ-145SM Netra",
                "TypeCode": "E145",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80032F"
            },
            {
                "Registration": "KW3555",
                "AircraftType": "Embraer ERJ-145SM Netra",
                "TypeCode": "E145",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800330"
            },
            {
                "Registration": "KW3556",
                "AircraftType": "Embraer ERJ-145SM Netra",
                "TypeCode": "E145",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800331"
            }
        ],
        "Embraer Legacy 600": [
            {
                "Registration": "K3601",
                "AircraftType": "Embraer Legacy 600",
                "TypeCode": "E35L",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002CB"
            },
            {
                "Registration": "K3602",
                "AircraftType": "Embraer Legacy 600",
                "TypeCode": "E35L",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002CC"
            },
            {
                "Registration": "K3603",
                "AircraftType": "Embraer Legacy 600",
                "TypeCode": "E35L",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002CD"
            },
            {
                "Registration": "K3604",
                "AircraftType": "Embraer Legacy 600",
                "TypeCode": "E35L",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002CE"
            },
            {
                "Registration": "KE-3605",
                "AircraftType": "Embraer Legacy 600",
                "TypeCode": "E35L",
                "AircraftOperator": "BorderSecurityForce",
                "HexCode": "800187"
            }
        ],
        "De Havilland Canada DHC-6-300 Twin Otter": [
            {
                "Registration": "VT-ELX",
                "AircraftType": "De Havilland Canada DHC-6-300 Twin Otter",
                "TypeCode": "DHC6",
                "AircraftOperator": "GeologicalSurveyOfIndia",
                "HexCode": "8007B9"
            }
        ],
        "Gulfstream SRA-1": [
            {
                "Registration": "K2961",
                "AircraftType": "Gulfstream SRA-1",
                "TypeCode": "GLF3",
                "AircraftOperator": "AviationResearchCentre",
                "HexCode": "8002F1"
            },
            {
                "Registration": "K2962",
                "AircraftType": "Gulfstream SRA-1",
                "TypeCode": "GLF3",
                "AircraftOperator": "AviationResearchCentre",
                "HexCode": "8002F2"
            }
        ],
        "HAL Light Utility Helicopter (LUH)": [
            {
                "Registration": "XH0834",
                "AircraftType": "HAL Light Utility Helicopter (LUH)",
                "TypeCode": "ALH",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800F04"
            }
        ],
        "HAL Hawk-i": [
            {
                "Registration": "XH0701",
                "AircraftType": "HAL Hawk-i",
                "TypeCode": "HAWK",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800001"
            }
        ],
        "HAL HS 748": [
            {
                "Registration": "BH1010",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800283"
            },
            {
                "Registration": "BH1011",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800284"
            },
            {
                "Registration": "BH1013",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800285"
            },
            {
                "Registration": "BH1048",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800286"
            },
            {
                "Registration": "H1031",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80028D"
            },
            {
                "Registration": "H1033",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80028E"
            },
            {
                "Registration": "H1034",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80028F"
            },
            {
                "Registration": "H1175",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800290"
            },
            {
                "Registration": "H1176",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800291"
            },
            {
                "Registration": "H1177",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800289"
            },
            {
                "Registration": "H1178",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80028A"
            },
            {
                "Registration": "H1179",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80028B"
            },
            {
                "Registration": "H1181",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800293"
            },
            {
                "Registration": "H1182",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800294"
            },
            {
                "Registration": "H1386",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800295"
            },
            {
                "Registration": "H1512",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800287"
            },
            {
                "Registration": "H1514",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800299"
            },
            {
                "Registration": "H1515",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80029A"
            },
            {
                "Registration": "H1516",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80029B"
            },
            {
                "Registration": "H1517",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80029C"
            },
            {
                "Registration": "H1518",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80029D"
            },
            {
                "Registration": "H1519",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80029E"
            },
            {
                "Registration": "H1521",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80029F"
            },
            {
                "Registration": "H1522",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002A0"
            },
            {
                "Registration": "H1523",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002A1"
            },
            {
                "Registration": "H1524",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002A2"
            },
            {
                "Registration": "H1525",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002A3"
            },
            {
                "Registration": "H1526",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002A4"
            },
            {
                "Registration": "H1527",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002A5"
            },
            {
                "Registration": "H1528",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002A6"
            },
            {
                "Registration": "H1529",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002A7"
            },
            {
                "Registration": "H1530",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002A8"
            },
            {
                "Registration": "H2065",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800297"
            },
            {
                "Registration": "H2066",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800298"
            },
            {
                "Registration": "H2177",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002AA"
            },
            {
                "Registration": "H2179",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002AB"
            },
            {
                "Registration": "H2180",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002AC"
            },
            {
                "Registration": "H2181",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002AD"
            },
            {
                "Registration": "H2182",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002AE"
            },
            {
                "Registration": "H2183",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002AF"
            },
            {
                "Registration": "H2184",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B0"
            },
            {
                "Registration": "H2372",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B1"
            },
            {
                "Registration": "H2373",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B2"
            },
            {
                "Registration": "H2374",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B3"
            },
            {
                "Registration": "H2375",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B4"
            },
            {
                "Registration": "H2376",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B5"
            },
            {
                "Registration": "H2377",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B6"
            },
            {
                "Registration": "H2378",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B7"
            },
            {
                "Registration": "H2379",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B8"
            },
            {
                "Registration": "H2381",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002B9"
            },
            {
                "Registration": "H913",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800282"
            },
            {
                "Registration": "H915",
                "AircraftType": "HAL HS 748",
                "TypeCode": "A748",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800288"
            }
        ],
        "HAL Tejas LCA (development aircraft)": [
            {
                "Registration": "KH2013",
                "AircraftType": "HAL Tejas LCA (development aircraft)",
                "TypeCode": "LCA",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801515"
            },
            {
                "Registration": "KH2018",
                "AircraftType": "HAL Tejas LCA (development aircraft)",
                "TypeCode": "LCA",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801447"
            }
        ],
        "HAL Tejas LCA Mk.1": [
            {
                "Registration": "LA5021",
                "AircraftType": "HAL Tejas LCA Mk.1",
                "TypeCode": "LCA",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "801448"
            }
        ],
        "Ilyushin Il-76MD": [
            {
                "Registration": "K2663",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "000100"
            },
            {
                "Registration": "KI2664",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002D8"
            },
            {
                "Registration": "K2665",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002D9"
            },
            {
                "Registration": "KI2666",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002DA"
            },
            {
                "Registration": "KI2878",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002DB"
            },
            {
                "Registration": "KI2879",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002DC"
            },
            {
                "Registration": "K2901",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002DD"
            },
            {
                "Registration": "K2902",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002DE"
            },
            {
                "Registration": "K2999",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002DF"
            },
            {
                "Registration": "K3000",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002E0"
            },
            {
                "Registration": "K3077",
                "AircraftType": "Ilyushin Il-76MD",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8000E3"
            }
        ],
        "Ilyushin Il-78MKI": [
            {
                "Registration": "KJ-3449",
                "AircraftType": "Ilyushin Il-78MKI",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002D6"
            },
            {
                "Registration": "KJ-3450",
                "AircraftType": "Ilyushin Il-78MKI",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002E7"
            },
            {
                "Registration": "KJ-3451",
                "AircraftType": "Ilyushin Il-78MKI",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002BE"
            },
            {
                "Registration": "RK-3452",
                "AircraftType": "Ilyushin Il-78MKI",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002E9"
            },
            {
                "Registration": "RK-3453",
                "AircraftType": "Ilyushin Il-78MKI",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002EA"
            },
            {
                "Registration": "RK-3454",
                "AircraftType": "Ilyushin Il-78MKI",
                "TypeCode": "IL76",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "8002EB"
            }
        ],
        "Lockheed Martin C-130J-30 Hercules": [
            {
                "Registration": "KC-3801",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800332"
            },
            {
                "Registration": "KC-3802",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800333"
            },
            {
                "Registration": "KC-3804",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800335"
            },
            {
                "Registration": "KC-3805",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800336"
            },
            {
                "Registration": "KC-3806",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800337"
            },
            {
                "Registration": "KC-3807",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E1E"
            },
            {
                "Registration": "KC-3808",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E1F"
            },
            {
                "Registration": "KC-3809",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E20"
            },
            {
                "Registration": "KC-3810",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E21"
            },
            {
                "Registration": "KC-3811",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E22"
            },
            {
                "Registration": "KC-3812",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E23"
            },
            {
                "Registration": "KC-3813",
                "AircraftType": "Lockheed Martin C-130J-30 Hercules",
                "TypeCode": "C30J",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800E42"
            }
        ],
        "Pilatus PC-7 Mk II": [
            {
                "Registration": "P101",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800349"
            },
            {
                "Registration": "P102",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80034A"
            },
            {
                "Registration": "P103",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80034B"
            },
            {
                "Registration": "P104",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80034C"
            },
            {
                "Registration": "P105",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80034D"
            },
            {
                "Registration": "P106",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80034E"
            },
            {
                "Registration": "P107",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80034F"
            },
            {
                "Registration": "P108",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800350"
            },
            {
                "Registration": "P109",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800351"
            },
            {
                "Registration": "P110",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800352"
            },
            {
                "Registration": "P111",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800353"
            },
            {
                "Registration": "P112",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800354"
            },
            {
                "Registration": "P113",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800355"
            },
            {
                "Registration": "P114",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800356"
            },
            {
                "Registration": "P115",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800357"
            },
            {
                "Registration": "P116",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800358"
            },
            {
                "Registration": "P117",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800359"
            },
            {
                "Registration": "P118",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80035A"
            },
            {
                "Registration": "P119",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80035B"
            },
            {
                "Registration": "P120",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80035C"
            },
            {
                "Registration": "P121",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80035D"
            },
            {
                "Registration": "P122",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800758"
            },
            {
                "Registration": "P123",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800759"
            },
            {
                "Registration": "P124",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80075A"
            },
            {
                "Registration": "P125",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80075B"
            },
            {
                "Registration": "P126",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80075C"
            },
            {
                "Registration": "P127",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80075D"
            },
            {
                "Registration": "P128",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80075E"
            },
            {
                "Registration": "P129",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80075F"
            },
            {
                "Registration": "P130",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800760"
            },
            {
                "Registration": "P131",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800761"
            },
            {
                "Registration": "P132",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800762"
            },
            {
                "Registration": "P133",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800763"
            },
            {
                "Registration": "P134",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800764"
            },
            {
                "Registration": "P135",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800765"
            },
            {
                "Registration": "P136",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800766"
            },
            {
                "Registration": "P137",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800767"
            },
            {
                "Registration": "P138",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800768"
            },
            {
                "Registration": "P139",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800769"
            },
            {
                "Registration": "P140",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80076A"
            },
            {
                "Registration": "P141",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80076B"
            },
            {
                "Registration": "P142",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80076C"
            },
            {
                "Registration": "P143",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80076D"
            },
            {
                "Registration": "P144",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80076E"
            },
            {
                "Registration": "P145",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80076F"
            },
            {
                "Registration": "P146",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800770"
            },
            {
                "Registration": "P147",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800771"
            },
            {
                "Registration": "P148",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800772"
            },
            {
                "Registration": "P149",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800773"
            },
            {
                "Registration": "P150",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800774"
            },
            {
                "Registration": "P151",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800775"
            },
            {
                "Registration": "P152",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800776"
            },
            {
                "Registration": "P153",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800777"
            },
            {
                "Registration": "P154",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800778"
            },
            {
                "Registration": "P155",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800779"
            },
            {
                "Registration": "P156",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80077A"
            },
            {
                "Registration": "P157",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80077B"
            },
            {
                "Registration": "P158",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80077C"
            },
            {
                "Registration": "P159",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80077D"
            },
            {
                "Registration": "P160",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80077E"
            },
            {
                "Registration": "P161",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80077F"
            },
            {
                "Registration": "P162",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800780"
            },
            {
                "Registration": "P163",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800781"
            },
            {
                "Registration": "P164",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800782"
            },
            {
                "Registration": "P165",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800783"
            },
            {
                "Registration": "P166",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800784"
            },
            {
                "Registration": "P167",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800785"
            },
            {
                "Registration": "P168",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800786"
            },
            {
                "Registration": "P169",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800787"
            },
            {
                "Registration": "P170",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800788"
            },
            {
                "Registration": "P171",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "800789"
            },
            {
                "Registration": "P172",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80078A"
            },
            {
                "Registration": "P173",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80078B"
            },
            {
                "Registration": "P174",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80078C"
            },
            {
                "Registration": "P175",
                "AircraftType": "Pilatus PC-7 Mk II",
                "TypeCode": "PC7",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "80078D"
            }
        ],
        "SEPECAT Jaguar IM": [
            {
                "Registration": "JM255",
                "AircraftType": "SEPECAT Jaguar IM",
                "TypeCode": "JAGR",
                "AircraftOperator": "IndianAirForce",
                "HexCode": "83F255"
            }
        ]
    }
};

module.exports = masterDataset;
