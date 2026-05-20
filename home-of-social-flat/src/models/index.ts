import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  telegramId: { type: Number, required: true, unique: true },
  telegramUsername: String,
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  ordersCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false },
  lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

const AdminSchema = new Schema({
  telegramId: Number,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  lastLogin: Date,
  notifications: { type: Boolean, default: true },
}, { timestamps: true });

const ProductSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  originalPrice: Number,
  category: { type: String, required: true },
  categorySlug: { type: String, required: true },
  image: String,
  images: [String],
  rating: { type: Number, default: 5 },
  featured: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  stock: { type: Number, default: 100 },
  tags: [String],
  salesCount: { type: Number, default: 0 },
}, { timestamps: true });

const OrderSchema = new Schema({
  orderId: { type: String, required: true, unique: true },
  telegramId: Number,
  telegramUsername: String,
  userName: String,
  userEmail: String,
  products: [{
    productId: String,
    name: String,
    price: Number,
    quantity: Number,
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'processing', 'delivered', 'cancelled', 'rejected'], default: 'pending' },
  paymentProof: String,
  paymentStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  transactionRef: { type: String, default: 'N/A' },
  bankName: { type: String, default: 'PalmPay Limited' },
  accountName: { type: String, default: 'ANOINTED IFECHIDERE ACHILEFU' },
  accountNumber: { type: String, default: '9035509566' },
  approvedBy: String,
  notes: String,
  adminNotes: String,
}, { timestamps: true });

const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  icon: { type: String, default: '📦' },
  count: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

const LogSchema = new Schema({
  type: { type: String, required: true },
  userId: String,
  userName: String,
  telegramUsername: String,
  telegramId: Number,
  productName: String,
  amount: Number,
  status: String,
  orderId: String,
  message: { type: String, required: true },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

const PaymentSchema = new Schema({
  userId: String,
  username: String,
  productId: String,
  productName: String,
  amount: Number,
  paymentMethod: { type: String, default: 'Bank Transfer' },
  bankName: { type: String, default: 'PalmPay Limited' },
  accountNumber: { type: String, default: '9035509566' },
  accountName: { type: String, default: 'ANOINTED IFECHIDERE ACHILEFU' },
  transactionRef: String,
  proofImage: String,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: String,
}, { timestamps: true });

const DeliverySchema = new Schema({
  orderId: { type: String, required: true },
  telegramId: Number,
  productName: String,
  email: String,
  password: String,
  customInstructions: String,
  deliveredBy: String,
  deliveredAt: Date,
  status: { type: String, enum: ['pending', 'delivered'], default: 'pending' },
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
export const Admin = mongoose.model('Admin', AdminSchema);
export const Product = mongoose.model('Product', ProductSchema);
export const Order = mongoose.model('Order', OrderSchema);
export const Category = mongoose.model('Category', CategorySchema);
export const Log = mongoose.model('Log', LogSchema);
export const Payment = mongoose.model('Payment', PaymentSchema);
export const Delivery = mongoose.model('Delivery', DeliverySchema);
