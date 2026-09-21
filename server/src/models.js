import mongoose from 'mongoose';
const { Schema, model } = mongoose;

export const User = model('User', new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
}, { timestamps: true }));

const titleSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['movie', 'series'], default: 'movie' },
  genres: [String],
  cast: [String],
  description: String,
  releaseYear: Number,
  posterUrl: String,
  streamUrl: String, // later: S3 path -> signed CloudFront URL
  minPlan: { type: String, enum: ['free', 'basic', 'premium'], default: 'free' },
}, { timestamps: true });
titleSchema.index({ genres: 1 });
titleSchema.index({ name: 1 });
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
