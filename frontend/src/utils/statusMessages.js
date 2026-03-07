export const STATUS_MESSAGES = {
    200: "200 OK: Everything went perfectly. Here's your data!",
    400: "400 Bad Request: You sent me bad data (like missing an email address).",
    401: "401 Unauthorized: You aren't logged in.",
    404: "404 Not Found: That endpoint or data doesn't exist.",
    500: "500 Internal Server Error: My backend code crashed (the kitchen is on fire!).",
};

export const ACTION_DESCRIPTIONS = {
    GET: 'GET (Read): "Give me the data." (e.g., Get my profile info).',
    POST: 'POST (Create): "Here is new data, save it." (e.g., Publish a new tweet).',
    PUT: 'PUT / PATCH (Update): "Update this existing data." (e.g., Change my profile picture).',
    PATCH: 'PUT / PATCH (Update): "Update this existing data." (e.g., Change my profile picture).',
    DELETE: 'DELETE (Delete): "Remove this data." (e.g., Delete my account).',
};

export const getStatusMessage = (status, defaultMessage = "An unexpected error occurred.") => {
    return STATUS_MESSAGES[status] || defaultMessage;
};

