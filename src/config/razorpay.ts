import Razorpay from "razorpay";

export interface RazorpayConfig {
  key_id: string;
  key_secret: string;
}

export const initRazorpay = (): Razorpay => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not found in environment variables");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export const razorpayInstance = initRazorpay();
