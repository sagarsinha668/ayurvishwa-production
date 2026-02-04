import { Document, Schema, model } from 'mongoose';

export interface MedicineDocument extends Document {
  name: string;
  quantity: number;
  lowStockThreshold: number;
}

const medicineSchema = new Schema<MedicineDocument>(
  {
    name: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0 },
  }
);

// // Unique medicine names
// medicineSchema.index({ name: 1 }, { unique: true });

export const Medicine = model<MedicineDocument>('Medicine', medicineSchema);
