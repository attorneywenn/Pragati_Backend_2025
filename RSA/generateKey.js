import { writeFileSync, appendFileSync } from "fs";
import crypto from "crypto";

export const generateKey = async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    try {
        writeFileSync('./RSA/privateKey.pem', privateKey);
        writeFileSync('./RSA/publicKey.pem', publicKey);
        console.log("[LOG]: RSA Encryption Keys Generated Succussfully");
    } catch (error) {
        console.log("[ERROR]: Error in Generating RSA Keys", error);
        appendFileSync('./logs/server.log', `[${new Date().toLocaleString()}]: ${error}\n`);
    }
}