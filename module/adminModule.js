import { transactionsDb, pragatiDb } from "../db/poolConnection.js";
import {
    setResponseOk,
    setResponseInternalError,
    setResponseBadRequest,
} from "../utilities/response.js";
import { logError } from "../utilities/errorLogger.js";
import {
    checkUserIDsExists,
    checkRoleIDAlreadyExists,
    checkRoleNameAlreadyExists,
} from "../utilities/dbUtilities/adminUtilities.js";

const adminModule = {
    getAllTransactions: async () => {
        const db = await transactionsDb.promise().getConnection();
        try {
            // Lock table for READ
            await db.query("LOCK TABLES transactionData READ");
            const query = "SELECT * FROM transactionData";
            const [results] = await db.query(query);

            return setResponseOk(
                "All transactions fetched successfully",
                results,
            );
        } catch (error) {
            logError(error, "adminModule:getAllTransactions", "db");
            return setResponseInternalError();
        } finally {
            await db.query("UNLOCK TABLES");
            db.release();
        }
    },
    getAllRoles: async () => {
        const db = await pragatiDb.promise().getConnection();
        try {
            // Lock table for READ
            await db.query("LOCK TABLES userRole READ");
            const query = "SELECT roleID, roleName, createdAt FROM userRole";
            const [results] = await db.query(query);

            return setResponseOk("All roles fetched successfully", results);
        } catch (error) {
            logError(error, "adminModule:getAllRoles", "db");
            return setResponseInternalError();
        } finally {
            await db.query("UNLOCK TABLES");
            db.release();
        }
    },
    getEventWiseAmountGenerated: async () => {
        const db = await pragatiDb.promise().getConnection();
        try {
            await db.query("LOCK TABLES registrationData READ");

            // Get the sum of amountPaid for each eventID where registrationStatus = '2' (REGISTERED/PAYED)
            const query = `
        SELECT 
          eventID, 
          SUM(amountPaid) AS totalAmountPaid 
        FROM registrationData
        WHERE registrationStatus = '2'
        GROUP BY eventID
      `;

            const [results] = await db.query(query);

            // Return standardized success response
            return setResponseOk(
                "Amount generated by all events fetched successfully",
                results,
            );
        } catch (error) {
            logError(error, "adminModule:getEventWiseAmountGenerated", "db");
            return setResponseInternalError();
        } finally {
            // Unlock the tables and release the connection
            await db.query("UNLOCK TABLES");
            db.release();
        }
    },
    editUserAccountStatus: async (studentID, accountStatus) => {
        const db = await pragatiDb.promise().getConnection();
        try {
            // 1) Check if the user exists
            const userCheck = await checkUserIDsExists([studentID], db);
            if (userCheck) {
                return setResponseBadRequest(userCheck);
            }
            await db.query("LOCK TABLES userData WRITE");

            const [result] = await db.query(
                "UPDATE userData SET accountStatus = ? WHERE userID = ?",
                [accountStatus, studentID],
            );
            if (result.affectedRows !== 1) {
                return setResponseBadRequest(
                    "Unable to change the status of the user. The user may not exist or the status is unchanged.",
                );
            }
            return setResponseOk("User account status updated successfully.", {
                studentID,
                accountStatus,
            });
        } catch (err) {
            logError(err, "userModule.editUserAccountStatus", "db");
            return setResponseInternalError();
        } finally {
            await db.query("UNLOCK TABLES");
            db.release();
        }
    },
    updateUserRole: async (studentID, roleID) => {
        const db = await pragatiDb.promise().getConnection();
        try {
            // Check if userID exists
            const userCheck = await checkUserIDsExists(studentID, db);
            if (userCheck) {
                return setResponseBadRequest(userCheck);
            }
            // Lock userData for WRITE
            await db.query("LOCK TABLES userData WRITE");

            // Update
            const [result] = await db.query(
                "UPDATE userData SET roleID = ? WHERE userID = ?",
                [roleID, studentID],
            );
            if (result.affectedRows !== 1) {
                return setResponseBadRequest(
                    "Unable to change the role of the user. The user may not exist or the role is unchanged.",
                );
            }

            return setResponseOk("User role updated successfully.", {
                studentID,
                roleID,
            });
        } catch (err) {
            logError(err, "adminModule.updateUserRole", "db");
            return setResponseInternalError();
        } finally {
            await db.query("UNLOCK TABLES");
            db.release();
        }
    },
    addNewUserRole: async (roleID, roleName) => {
        const db = await pragatiDb.promise().getConnection();
        try {
            // Check if the roleID already exists in userRole
            const doesRoleIDExist = await checkRoleIDAlreadyExists(roleID, db);
            if (doesRoleIDExist) {
                return setResponseBadRequest(
                    "A role with this roleID already exists.",
                );
            }
            const doesRoleNameExist = await checkRoleNameAlreadyExists(
                roleName,
                db,
            );

            if (doesRoleNameExist) {
                return setResponseBadRequest(
                    "A role with this roleName already exists.",
                );
            }

            await db.query("LOCK TABLES userRole WRITE");

            // Insert the new role
            const insertQuery = `INSERT INTO userRole (roleID, roleName) VALUES (?, ?)`;
            const [result] = await db.query(insertQuery, [roleID, roleName]);

            if (result.affectedRows === 0) {
                return setResponseBadRequest("Failed to add new user role.");
            }
            return setResponseOk("New user role added successfully.", {
                roleID,
                roleName,
            });
        } catch (err) {
            logError(err, "adminModule.addNewUserRole", "db");
            return setResponseInternalError();
        } finally {
            await db.query("UNLOCK TABLES");
            db.release();
        }
    },
    getStudentsOfEvent: async (eventID) => {
        const db = await pragatiDb.promise().getConnection();
        try {
            await db.query("LOCK TABLES userData READ, groupDetail READ");
            const query = `SELECT 
            groupDetail.userID,
            groupDetail.eventID,
            userData.userEmail,
            userData.userName,
            userData.rollNumber,
            userData.phoneNumber,
            userData.collegeName,
            userData.collegeCity,
            userData.userDepartment,
            userData.academicYear,
            userData.degree,
            userData.needAccommodationDay1,
            userData.needAccommodationDay2,
            userData.isAmrita
            FROM userData JOIN groupDetail
            ON userData.userID = groupDetail.userID
            WHERE groupDetail.eventID = ?
            AND userData.accountStatus = 2
            `;
            const [studentList] = await db.query(query, [eventID]);
            if (studentList.length == 0) {
                return setResponseOk("No students found for given event!");
            }
            return setResponseOk(
                "Students selected successfully.",
                studentList,
            );
        } catch (err) {
            logError(err, "adminModule.getStudentsOfEvent", "db");
            return setResponseInternalError();
        } finally {
            await db.query("UNLOCK TABLES");
            db.release();
        }
    },
};

export default adminModule;
