import mongoose from 'mongoose';
const { Schema, model } = mongoose;

export const User = model('User', new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true }));

const validUrl = (value) => {
  if (!value) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};

const titleSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  type: { type: String, enum: ['movie', 'series'], default: 'movie' },
  genres: [String],
  cast: [String],
  description: { type: String, maxlength: 5000 },
  releaseYear: { type: Number, min: 1888, max: 2100, validate: { validator: (v) => v == null || Number.isInteger(v), message: 'Release year must be a whole number' } },
  posterUrl: { type: String, trim: true, validate: { validator: validUrl, message: 'Poster URL must use http or https' } },
  streamUrl: { type: String, trim: true, validate: { validator: validUrl, message: 'Stream URL must use http or https' } }, // later: S3 path -> signed CloudFront URL
  minPlan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
  viewCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });
titleSchema.index({ genres: 1 });
titleSchema.index({ name: 1 });
titleSchema.index({ viewCount: -1, createdAt: -1 });
titleSchema.index({ createdAt: -1 });
export const Title = model('Title', titleSchema);

export const Subscription = model('Subscription', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  plan: { type: String, enum: ['basic', 'premium'], required: true },
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
}));

const watchSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  titleId: { type: Schema.Types.ObjectId, ref: 'Title' },
  progressSeconds: { type: Number, default: 0 },
}, { timestamps: true });
watchSchema.index({ userId: 1, titleId: 1 }, { unique: true });
export const Watch = model('Watch', watchSchema);

