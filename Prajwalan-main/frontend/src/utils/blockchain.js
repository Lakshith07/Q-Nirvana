/**
 * Simulated Blockchain Utility for Q Nirvana Medical Records
 * Ensures records are tamper-proof and cryptographically linked.
 */

import CryptoJS from 'crypto-js';

class MedicalBlockchain {
    constructor() {
        this.chain = [];
    }

    // Generate a secure hash for a medical record block
    calculateHash(index, previousHash, timestamp, data) {
        return CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data)).toString();
    }

    /**
     * "Seal" a medical record into a block
     * @param {Object} record - The consultation or lab report data
     */
    secureRecord(record) {
        const index = this.chain.length;
        const previousHash = index === 0 ? "0" : this.chain[index - 1].hash;
        const timestamp = new Date().toISOString();
        const hash = this.calculateHash(index, previousHash, timestamp, record);

        const block = {
            index,
            timestamp,
            data: record,
            previousHash,
            hash,
            verified: true
        };

        // In a real hackathon project, we might store this in a 'blockchain_logs' table
        // But for UI demonstration, we simulate the verification status
        console.log(`🔒 Block #${index} Secured. Hash: ${hash.substring(0, 10)}...`);
        return block;
    }

    /**
     * Verify if a record has been tampered with
     */
    verifyIntegrity(block, previousBlock) {
        const recalculatedHash = this.calculateHash(
            block.index,
            block.previousHash,
            block.timestamp,
            block.data
        );

        if (block.hash !== recalculatedHash) return false;
        if (previousBlock && block.previousHash !== previousBlock.hash) return false;
        return true;
    }
}

export const medicalChain = new MedicalBlockchain();
