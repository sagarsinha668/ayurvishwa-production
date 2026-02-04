import { Request, Response } from 'express';
import { Visit } from '../models/Visit';
import { Medicine } from '../models/Medicine';

export const getVisitByToken = async (req: Request, res: Response) => {
  try {
    const { token, hospitalId } = req.query;
    if (!token || !hospitalId) {
      return res.status(400).json({ message: 'Token and hospitalId are required' });
    }

    // Get today's range
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const visit = await Visit.findOne({
      visitToken: Number(token),
      hospitalId,
      createdAt: { $gte: start, $lte: end }
    }).populate('patientId');

    if (!visit) {
      return res.status(404).json({ message: 'Visit not found for this token today' });
    }

    res.json(visit);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getOptimizedVisitByToken = async (req: Request, res: Response) => {
  try {
    const { token, hospitalId } = req.query;
    if (!token || !hospitalId) {
      return res.status(400).json({ message: 'Token and hospitalId are required' });
    }

    // Get today's range
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const visit = await Visit.findOne({
      visitToken: Number(token),
      hospitalId,
      createdAt: { $gte: start, $lte: end }
    })
      .populate('patientId', 'name sex dob phoneNo address')
      .select('visitToken patientId prescribedMedicines medicineGiven givenMedicines');

    if (!visit) {
      return res.status(404).json({ message: 'Visit not found for this token today' });
    }

    res.json(visit);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const giveMedicines = async (req: Request, res: Response) => {
  try {
    const { visitId, hospitalId, medicines } = req.body;

    if (!visitId || !hospitalId || !Array.isArray(medicines)) {
      return res.status(400).json({ message: 'Invalid request data' });
    }

    const visit = await Visit.findById(visitId);
    if (!visit) {
      return res.status(400).json({ message: 'Visit not found' });
    }

    if (visit.medicineGiven) {
      return res.status(400).json({ message: 'Medicines already given for this visit' });
    }

    // Validate all medicines and stock first
    for (const item of medicines) {
      const medicine = await Medicine.findOne({ name: item.medicineName });
      if (!medicine) {
        return res.status(400).json({ message: `Medicine "${item.medicineName}" not found in inventory` });
      }
      if (medicine.quantity < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for "${item.medicineName}". Available: ${medicine.quantity}, Required: ${item.quantity}` });
      }
    }

    // Deduct inventory
    for (const item of medicines) {
      const medicine = await Medicine.findOne({ name: item.medicineName });
      if (medicine) {
        medicine.quantity -= item.quantity;
        await medicine.save();
      }
    }

    // Update visit
    visit.medicineGiven = true;
    visit.givenMedicines = medicines;
    await visit.save();

    res.json({ success: true, message: 'Medicines dispensed successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message || 'Failed to dispense medicines' });
  }
};

export const getMedicines = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const query: any = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const medicines = await Medicine.find(query)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ name: 1 });

    const total = await Medicine.countDocuments(query);

    res.json({
      medicines,
      total,
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const addMedicine = async (req: Request, res: Response) => {
  try {
    const { name, quantity, lowStockThreshold } = req.body;

    const newMedicine = new Medicine({
      name,
      quantity,
      lowStockThreshold
    });

    await newMedicine.save();
    res.status(201).json(newMedicine);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const updateMedicine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, quantity, lowStockThreshold } = req.body;

    if (lowStockThreshold !== undefined && quantity !== undefined) {
      if (lowStockThreshold < 0 || lowStockThreshold >= quantity) {
        return res.status(400).json({ message: 'Threshold quantity must be greater than 0 and less than medicine quantity' });
      }
    }

    const updatedMedicine = await Medicine.findByIdAndUpdate(
      id,
      { name, quantity, lowStockThreshold },
      { new: true }
    );

    if (!updatedMedicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    res.json(updatedMedicine);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getMedicineNames = async (_req: Request, res: Response) => {
  try {
    const medicines = await Medicine.find({}).select('name _id').sort({ name: 1 });
    res.json(medicines.map(m => ({ id: m._id, name: m.name })));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMedicineById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const medicine = await Medicine.findById(id);
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }
    res.json(medicine);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMedicineByExactName = async (req: Request, res: Response) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const medicine = await Medicine.findOne({ name });
    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    res.json(medicine);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export const bulkCreateMedicines = async (req: Request, res: Response) => {
  try {
    const { medicines } = req.body; // Expecting { medicines: [...] }
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty medicines array' });
    }

    // Basic validation
    for (const m of medicines) {
      if (!m.name || m.quantity === undefined || m.lowStockThreshold === undefined) {
        return res.status(400).json({ message: 'All fields (name, quantity, lowStockThreshold) are required for each item' });
      }
    }

    const created = await Medicine.insertMany(medicines);
    res.status(201).json(created);
  } catch (error: any) {
    // Handle duplicate key error specially if needed, but generic 400 is okay for now
    res.status(400).json({ message: error.message });
  }
};

export const bulkUpdateMedicines = async (req: Request, res: Response) => {
  try {
    const { medicines } = req.body; // Expecting { medicines: [{ id, ... }] }
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ message: 'Invalid or empty medicines array' });
    }

    const operations = medicines.map((m: any) => ({
      updateOne: {
        filter: { _id: m.id || m._id },
        update: {
          $set: {
            name: m.name,
            quantity: m.quantity,
            lowStockThreshold: m.lowStockThreshold
          }
        }
      }
    }));

    const result = await Medicine.bulkWrite(operations);
    res.json({ message: 'Bulk update successful', result });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
