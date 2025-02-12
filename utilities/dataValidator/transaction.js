import { checkValidUser } from "../dbUtilities/userUtilities";

const validateTransactionID = async (txnID, db) => {
    if(!txnID){
        return "Missing Transaction ID !!";
    }

    const transactionData = txnID.split("-");

    if(transactionData[0] !== "TXN") {
        return "Invalid Transaction ID !!";
    }
    
    const userID = transactionData[1];
    const eventID = transactionData[2];

    const userData = checkValidUser(null, db, "userID", userID);
    if(userData.responseData.length === 0){
        return "Transaction ID of Invalid User !!";
    }

    const [eventData] = await db.query(
        "SELECT * FROM eventDaa WHERE eventID = ?",
        [eventID]
    );

    if(eventData.length === 0){
        return "Transaction ID of Invalid Event !!";
    }
    return null;
}

export default validateTransactionID;