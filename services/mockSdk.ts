import { TransactionType } from '../types';

/**
 * Simulates a network delay and potential random failures for realistic testing
 */
export const simulateTransaction = (type: TransactionType, amount: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const delay = Math.random() * 2000 + 1000; // 1-3 seconds delay
    
    setTimeout(() => {
      // 5% chance of failure for testing error states
      const shouldFail = Math.random() > 0.95;
      
      if (shouldFail) {
        reject(new Error("Network simulation error"));
      } else {
        resolve(true);
      }
    }, delay);
  });
};