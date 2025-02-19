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
            await db.query("LOCK TABLES eventData READ");
            const [data] = await db.query(
                "SELECT isGroup FROM eventData WHERE eventID = ?",
                [eventID],
            );
            if (data.length == 0) {
                return setResponseBadRequest("No event with id found!");
            }
            let query;
            if (data[0].isGroup == 1) {
                await db.query(
                    "LOCK TABLES userData AS ud READ, groupDetail AS gd READ, registrationData AS rd READ",
                );
                query = `SELECT 
                    gd.registrationID,
                    rd.teamName,
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'userID', gd.userID,
                            'eventID', gd.eventID,
                            'role', gd.roleDescription,
                            'userEmail', ud.userEmail,
                            'userName', ud.userName,
                            'rollNumber', ud.rollNumber,
                            'phoneNumber', ud.phoneNumber,
                            'collegeName', ud.collegeName,
                            'collegeCity', ud.collegeCity,
                            'userDepartment', ud.userDepartment,
                            'academicYear', ud.academicYear,
                            'degree', ud.degree,
                            'needAccommodationDay1', ud.needAccommodationDay1,
                            'needAccommodationDay2', ud.needAccommodationDay2,
                            'isAmrita', ud.isAmrita
                        )
                    ) AS teamMembers
                FROM groupDetail gd
                JOIN userData ud ON gd.userID = ud.userID
                JOIN registrationData rd ON gd.registrationID = rd.registrationID
                WHERE gd.eventID = ?
                AND ud.accountStatus = '2'
                GROUP BY gd.registrationID, rd.teamName
            `;
            } else {
                await db.query("LOCK TABLES groupDetail READ, userData READ");
                query = `
                SELECT 
                groupDetail.registrationID,
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
            }

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
    getAllUsers: async () => {
        const db = await pragatiDb.promise().getConnection();
        try {
            const query = `
            SELECT 
                u.userID,
                u.userEmail,
                u.userName,
                u.rollNumber,
                u.phoneNumber,
                u.collegeName,
                u.collegeCity,
                u.userDepartment,
                u.academicYear,
                u.degree,
                u.needAccommodationDay1,
                u.needAccommodationDay2,
                u.isAmrita,
                u.roleID,
                (SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                        'eventID', e.eventID,
                        'eventName', e.eventName,
                        'eventFee', e.eventFee
                    )
                ) FROM eventData e 
                JOIN groupDetail g ON e.eventID = g.eventID
                WHERE g.userID = u.userID) 
                AS registeredEvents
            FROM userData u`;
            await db.query(
                "LOCK TABLES groupDetail AS g READ, eventData AS e READ, userData AS u READ",
            );
            const [result] = await db.query(query);
            if (result.length == 0) {
                return setResponseOk("No users found!");
            }
            return setResponseOk("Fetched all users", result);
        } catch (err) {
            logError(err, "adminModule.getAllUsers", "db");
            return setResponseInternalError();
        } finally {
            await db.query("UNLOCK TABLES");
            db.release();
        }
    },
};

export default adminModule;
