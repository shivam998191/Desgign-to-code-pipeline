import { UserConfigModel } from '../models/userConfig.model.js';

export async function getUserConfig(_req, res) {
  try {
    const config = await UserConfigModel.findOne({}).sort({ updatedAt: -1 }).lean();
    if (!config) {
      res.status(200).json(null);
      return;
    }
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch user config',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

export async function upsertUserConfig(req, res) {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({ message: 'Request body must be an object' });
      return;
    }

    const config = await UserConfigModel.findOneAndUpdate(
      {},
      req.body,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    ).lean();

    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to save user config',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
