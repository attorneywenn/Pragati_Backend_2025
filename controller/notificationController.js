import notificationModule from "../module/notificationModule.js";
import {
    validateUpdateNotificationData,
    validateAddNotificationData,
} from "../utilities/dataValidator/notification.js";
import {
    setResponseBadRequest,
    setResponseInternalError,
} from "../utilities/response.js";
import { logError } from "../utilities/errorLogger.js";

const notificationController = {
    getAllNotifications: async (req, res) => {
        try {
            const response = await notificationModule.getAllNotifications();
            return res
                .status(response.responseCode)
                .json(response.responseBody);
        } catch (err) {
            logError(err, "notificationController:getAllNotifications", "db");
            const response = setResponseInternalError();
            return res
                .status(response.responseCode)
                .json(response.responseBody);
        }
    },
    addNotification: async (req, res) => {
        const { title, description, author, venue, startDate, endDate } =
            req.body;
        const errors = validateAddNotificationData(req.body);
        if (errors != null) {
            const response = setResponseBadRequest(errors);
            return res
                .status(response.responseCode)
                .json(response.responseBody);
        }
        try {
            const response = await notificationModule.addNotification(
                title,
                description,
                author,
                venue,
                startDate,
                endDate,
            );
            return res
                .status(response.responseCode)
                .json(response.responseBody);
        } catch (err) {
            logError(err, "notificationController:addNotification", "db");
            const response = setResponseInternalError();
            return res
                .status(response.responseCode)
                .json(response.responseBody);
        }
    },
    updateNotification: async (req, res) => {
        const {
            notificationID,
            title,
            description,
            author,
            venue,
            startDate,
            endDate,
        } = req.body;
        const errors = validateUpdateNotificationData(req.body);
        if (errors != null) {
            const response = setResponseBadRequest(errors);
            return res
                .status(response.responseCode)
                .json(response.responseBody);
        }
        try {
            const response = await notificationModule.updateNotification(
                notificationID,
                title,
                description,
                author,
                venue,
                startDate,
                endDate,
            );
            return res
                .status(response.responseCode)
                .json(response.responseBody);
        } catch (err) {
            logError(err, "notificationController:updateNotification", "db");
            const response = setResponseInternalError();
            return res
                .status(response.responseCode)
                .json(response.responseBody);
        }
    },
};

export default notificationController;
