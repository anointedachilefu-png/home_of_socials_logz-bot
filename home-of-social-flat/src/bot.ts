import { Telegraf, Markup, Context } from 'telegraf';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';
import { generateOrderId, formatCurrency, formatDate, escapeMarkdown } from './utils/helpers';
import { Product, Order, Category, Log, User, Admin, Payment, Delivery } from './models';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || '8644248852:AAFusEzvsSt_jQ2wYZzJQN0H7t_lUxV_xqc';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homeofsocial';
const ADMIN_CHAT_IDS = (process.env.ADMIN_CHAT_IDS || 'anointed_hub,lorddermott3306').split(',');
const CHANNEL_ID = process.env.CHANNEL_ID || '@anointed_hub';
const LOG_CHANNEL = process.env.LOG_CHANNEL || '@home_of_socials_logz';

const bot = new Telegraf(BOT_TOKEN);

// User session storage
const userSessions = new Map<number, any>();

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');
    await seedDatabase();
  } catch (error) {
    console.error('❌ MongoDB Error:', error);
  }
}

// Seed database with initial data
async function seedDatabase() {
  const productCount = await Product.countDocuments();
  if (productCount === 0) {
    const products = [
      { name: 'TikTok', description: 'Random TikTok account, 100+ followers', price: 5000, originalPrice: 7000, stock: 45, category: 'TikTok', categorySlug: 'tiktok', featured: true, tags: ['tiktok', 'social', 'followers'] },
      { name: 'Snapchat', description: 'USA Snapchat Account, Months Old, Attractive Profile, Must Use PAID VPN', price: 4000, originalPrice: 5500, stock: 57, category: 'Snapchat', categorySlug: 'snapchat', featured: true, tags: ['snapchat', 'usa', 'vpn'] },
      { name: 'EXPRESSVPN', description: 'One month account', price: 3500, originalPrice: 5000, stock: 88, category: 'VPN', categorySlug: 'vpn', featured: true, tags: ['vpn', 'expressvpn', 'security'] },
      { name: 'NETFLIX', description: '1-3 months Netflix', price: 3500, originalPrice: 5000, stock: 13, category: 'Streaming', categorySlug: 'streaming', featured: true, tags: ['netflix', 'streaming', 'movies'] },
      { name: 'FACEBOOK', description: 'Facebook account with 200+ friends', price: 7500, originalPrice: 9500, stock: 99, category: 'Facebook', categorySlug: 'facebook', featured: true, tags: ['facebook', 'friends', 'real'] },
      { name: 'TEXTPLUS', description: 'Hotmail Textplus', price: 3900, originalPrice: 5000, stock: 10, category: 'Texting Apps', categorySlug: 'texting-apps', featured: false, tags: ['textplus', 'hotmail', 'sms'] },
      { name: 'FACEBOOK PAGE', description: 'USA Facebook account with created pages', price: 4500, originalPrice: 6000, stock: 1, category: 'Facebook', categorySlug: 'facebook', featured: false, tags: ['facebook', 'page', 'usa'] },
      { name: 'FACEBOOK', description: 'Facebook account with 100+ real friends', price: 6500, originalPrice: 8500, stock: 62, category: 'Facebook', categorySlug: 'facebook', featured: true, tags: ['facebook', 'friends', 'real'] },
      { name: 'GOOGLE VOICE', description: 'Fresh Google Voice account', price: 5000, originalPrice: 7000, stock: 20, category: 'Digital Services', categorySlug: 'digital-services', featured: false, tags: ['google', 'voice', 'fresh'] },
    ];
    await Product.insertMany(products);
    console.log('✅ Products seeded');
  }

  const categoryCount = await Category.countDocuments();
  if (categoryCount === 0) {
    const categories = [
      { name: 'All', slug: 'all', description: 'All products', icon: '🛍️', count: 9 },
      { name: 'Facebook', slug: 'facebook', description: 'Facebook accounts', icon: '👤', count: 3 },
      { name: 'Reddit', slug: 'reddit', description: 'Reddit accounts', icon: '🤖', count: 0 },
      { name: 'VPN', slug: 'vpn', description: 'VPN services', icon: '🔒', count: 1 },
      { name: 'Snapchat', slug: 'snapchat', description: 'Snapchat accounts', icon: '👻', count: 1 },
      { name: 'Streaming', slug: 'streaming', description: 'Streaming accounts', icon: '🎬', count: 1 },
      { name: 'Texting Apps', slug: 'texting-apps', description: 'Texting applications', icon: '💬', count: 1 },
      { name: 'Instagram', slug: 'instagram', description: 'Instagram accounts', icon: '📸', count: 0 },
      { name: 'Gmail', slug: 'gmail', description: 'Gmail accounts', icon: '📧', count: 0 },
      { name: 'Twitter/X', slug: 'twitter', description: 'Twitter/X accounts', icon: '🐦', count: 0 },
      { name: 'TikTok', slug: 'tiktok', description: 'TikTok accounts', icon: '🎵', count: 1 },
      { name: 'Digital Services', slug: 'digital-services', description: 'Digital services', icon: '⚡', count: 1 },
    ];
    await Category.insertMany(categories);
    console.log('✅ Categories seeded');
  }
}

// ============== KEYBOARD MENUS ==============
const mainMenu = Markup.inlineKeyboard([
  [Markup.button.callback('🛍️ Browse Products', 'browse_products')],
  [Markup.button.callback('📦 My Orders', 'my_orders'), Markup.button.callback('💬 Support', 'support')],
  [Markup.button.callback('📋 Categories', 'categories'), Markup.button.callback('ℹ️ About', 'about')],
]);

const backToMenu = Markup.inlineKeyboard([
  [Markup.button.callback('⬅️ Back to Menu', 'main_menu')],
]);

// ============== START COMMAND ==============
bot.start(async (ctx) => {
  const user = ctx.from;

  try {
    await User.findOneAndUpdate(
      { telegramId: user.id },
      { 
        telegramId: user.id,
        telegramUsername: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        lastActive: new Date()
      },
      { upsert: true }
    );

    await Log.create({
      type: 'user_start',
      telegramId: user.id,
      telegramUsername: user.username,
      userName: `${user.first_name} ${user.last_name || ''}`,
      message: 'User started bot',
    });
  } catch (e) {}

  const welcomeText = `👋 *Welcome to Home of Social!*\n\n` +
    `🏆 *Premium Digital Marketplace*\n\n` +
    `🛍️ *What we offer:*\n` +
    `• Social Media Accounts\n` +
    `• VPN Services\n` +
    `• Streaming Accounts\n` +
    `• Digital Products\n\n` +
    `💳 *Secure Payments via PalmPay*\n` +
    `👤 *Account:* ANOINTED IFECHIDERE ACHILEFU\n` +
    `🔢 *Number:* \`9035509566\`\n\n` +
    `⚡ *Fast Delivery • 24/7 Support • Premium Quality*\n\n` +
    `_Click below to start shopping!_`;

  await ctx.reply(welcomeText, {
    parse_mode: 'MarkdownV2',
    ...mainMenu,
  });
});

// ============== BROWSE PRODUCTS ==============
bot.action('browse_products', async (ctx) => {
  await ctx.answerCbQuery();

  let products;
  try {
    products = await Product.find({ enabled: true, stock: { $gt: 0 } }).sort({ featured: -1, createdAt: -1 });
  } catch (e) {
    products = [];
  }

  if (!products || products.length === 0) {
    await ctx.editMessageText('❌ No products available. Please check back later!', {
      ...backToMenu,
    });
    return;
  }

  const buttons = products.map((p: any) => [
    Markup.button.callback(
      `${p.name} — ${formatCurrency(p.price)} (${p.stock} left)`,
      `product_${p._id}`
    ),
  ]);
  buttons.push([Markup.button.callback('⬅️ Back', 'main_menu')]);

  await ctx.editMessageText(
    '🛍️ *Available Products*\n\n_Click a product to view details:_',
    { parse_mode: 'MarkdownV2', ...Markup.inlineKeyboard(buttons) }
  );
});

// ============== CATEGORIES ==============
bot.action('categories', async (ctx) => {
  await ctx.answerCbQuery();

  let categories;
  try {
    categories = await Category.find({ enabled: true }).sort({ count: -1 });
  } catch (e) {
    categories = [];
  }

  const buttons = categories.map((c: any) => [
    Markup.button.callback(
      `${c.icon} ${c.name} (${c.count})`,
      `category_${c.slug}`
    ),
  ]);
  buttons.push([Markup.button.callback('⬅️ Back', 'main_menu')]);

  await ctx.editMessageText(
    '📋 *Product Categories*\n\n_Select a category:_',
    { parse_mode: 'MarkdownV2', ...Markup.inlineKeyboard(buttons) }
  );
});

bot.action(/category_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const categorySlug = ctx.match[1];

  let products;
  try {
    if (categorySlug === 'all') {
      products = await Product.find({ enabled: true, stock: { $gt: 0 } });
    } else {
      products = await Product.find({ categorySlug, enabled: true, stock: { $gt: 0 } });
    }
  } catch (e) {
    products = [];
  }

  if (!products || products.length === 0) {
    await ctx.editMessageText('❌ No products in this category.', {
      ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', 'categories')]]),
    });
    return;
  }

  const buttons = products.map((p: any) => [
    Markup.button.callback(
      `${p.name} — ${formatCurrency(p.price)}`,
      `product_${p._id}`
    ),
  ]);
  buttons.push([Markup.button.callback('⬅️ Back', 'categories')]);

  await ctx.editMessageText(
    `📂 *Products*\n\n_Click to view details:`,
    { parse_mode: 'MarkdownV2', ...Markup.inlineKeyboard(buttons) }
  );
});

// ============== PRODUCT DETAIL ==============
bot.action(/product_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const productId = ctx.match[1];

  let product;
  try {
    product = await Product.findById(productId);
  } catch (e) {
    product = null;
  }

  if (!product) {
    await ctx.reply('❌ Product not found.', backToMenu);
    return;
  }

  const session = userSessions.get(ctx.from.id) || {};
  session.selectedProduct = product;
  userSessions.set(ctx.from.id, session);

  const text = `📦 *${escapeMarkdown(product.name)}*\n\n` +
    `📝 ${escapeMarkdown(product.description)}\n\n` +
    `💰 *Price:* \`${formatCurrency(product.price)}\`\n` +
    `${product.originalPrice ? `~~${formatCurrency(product.originalPrice)}~~ 🔥\n` : ''}` +
    `📦 *Stock:* \`${product.stock}\` left\n` +
    `⭐ *Rating:* ${'⭐'.repeat(Math.floor(product.rating || 5))}\n` +
    `🏷️ *Category:* ${escapeMarkdown(product.category)}\n\n` +
    `💳 *Payment Details:*\n` +
    `Bank: PalmPay Limited\n` +
    `Name: ANOINTED IFECHIDERE ACHILEFU\n` +
    `Account: \`9035509566\`\n\n` +
    `⚡ Click BUY to place your order!`;

  const buyKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🛒 BUY NOW', `buy_${productId}`)],
    [Markup.button.callback('⬅️ Back to Products', 'browse_products')],
    [Markup.button.callback('🏠 Main Menu', 'main_menu')],
  ]);

  await ctx.editMessageText(text, {
    parse_mode: 'MarkdownV2',
    ...buyKeyboard,
  });
});

// ============== BUY FLOW ==============
bot.action(/buy_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const productId = ctx.match[1];

  let product;
  try {
    product = await Product.findById(productId);
  } catch (e) {
    product = null;
  }

  if (!product || product.stock <= 0) {
    await ctx.reply('❌ Sorry, this product is out of stock!', backToMenu);
    return;
  }

  const session = userSessions.get(ctx.from.id) || {};
  session.buying = true;
  session.productToBuy = product;
  session.step = 'quantity';
  userSessions.set(ctx.from.id, session);

  await ctx.reply(
    `🛒 *Buying: ${escapeMarkdown(product.name)}*\n\n` +
    `How many do you want? (Max: ${product.stock})\n\n` +
    `Reply with a number:`,
    { parse_mode: 'MarkdownV2' }
  );
});

// ============== HANDLE QUANTITY ==============
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions.get(userId);
  const text = ctx.message.text;

  if (!session || !session.buying) {
    if (text.toLowerCase().includes('help') || text.toLowerCase().includes('support')) {
      await ctx.reply(
        `💬 *Customer Support*\n\n` +
        `For help, contact our admins:\n` +
        `• @lorddermott3306\n` +
        `• @anointed_hub\n\n` +
        `Or visit: https://t.me/home_of_socials_logz`,
        { parse_mode: 'MarkdownV2', ...mainMenu }
      );
    }
    return;
  }

  if (session.step === 'quantity') {
    const qty = parseInt(text);
    if (isNaN(qty) || qty < 1 || qty > session.productToBuy.stock) {
      await ctx.reply(`❌ Invalid quantity. Please enter a number between 1 and ${session.productToBuy.stock}`);
      return;
    }

    session.quantity = qty;
    session.total = qty * session.productToBuy.price;
    session.step = 'confirm_payment';
    userSessions.set(userId, session);

    const paymentText = `📋 *Order Summary*\n\n` +
      `📦 Product: ${escapeMarkdown(session.productToBuy.name)}\n` +
      `🔢 Quantity: ${qty}\n` +
      `💰 Total: *\`${formatCurrency(session.total)}\`*\n\n` +
      `━━━━━━━━━━━━━━━\n` +
      `💳 *SEND PAYMENT TO:*\n\n` +
      `🏦 Bank: PalmPay Limited\n` +
      `👤 Name: ANOINTED IFECHIDERE ACHILEFU\n` +
      `🔢 Account: \`9035509566\`\n\n` +
      `━━━━━━━━━━━━━━━\n\n` +
      `✅ After payment, upload your payment screenshot here!\n` +
      `⏱️ Payment expires in 30 minutes`;

    await ctx.reply(paymentText, { parse_mode: 'MarkdownV2' });
    return;
  }

  if (session.step === 'transaction_ref') {
    session.transactionRef = text;
    session.step = 'awaiting_proof';
    userSessions.set(userId, session);

    await ctx.reply(
      `✅ Transaction reference saved: \`${escapeMarkdown(text)}\`\n\n` +
      `📸 Now upload your payment screenshot/receipt:`,
      { parse_mode: 'MarkdownV2' }
    );
    return;
  }
});

// ============== HANDLE PAYMENT PROOF ==============
bot.on('photo', async (ctx) => {
  const userId = ctx.from.id;
  const session = userSessions.get(userId);

  if (!session || !session.buying || session.step !== 'confirm_payment') {
    await ctx.reply('📸 Please start an order first by clicking "Browse Products"!', mainMenu);
    return;
  }

  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileId = photo.file_id;

  // Create order
  const orderId = generateOrderId();
  const orderData = {
    orderId,
    telegramId: userId,
    telegramUsername: ctx.from.username || 'no_username',
    userName: `${ctx.from.first_name} ${ctx.from.last_name || ''}`,
    products: [{
      productId: session.productToBuy._id?.toString() || 'demo',
      name: session.productToBuy.name,
      price: session.productToBuy.price,
      quantity: session.quantity,
    }],
    totalAmount: session.total,
    status: 'pending',
    paymentProof: fileId,
    paymentStatus: 'pending',
    transactionRef: session.transactionRef || 'N/A',
  };

  try {
    await Order.create(orderData);
    await Product.findByIdAndUpdate(session.productToBuy._id, {
      $inc: { stock: -session.quantity }
    });
  } catch (e) {
    console.error('Order save error:', e);
  }

  // Log the order
  try {
    await Log.create({
      type: 'order_created',
      telegramId: userId,
      telegramUsername: ctx.from.username,
      userName: `${ctx.from.first_name} ${ctx.from.last_name || ''}`,
      productName: session.productToBuy.name,
      amount: session.total,
      orderId,
      message: `New order: ${orderId}`,
    });
  } catch (e) {}

  // Notify admins with premium format
  const adminText = `━━━━━━━━━━━━━━━\n` +
    `💰 *NEW PAYMENT RECEIVED*\n\n` +
    `👤 *User:* @${ctx.from.username || 'no_username'}\n` +
    `🆔 *ID:* \`${userId}\`\n` +
    `📦 *Product:* ${escapeMarkdown(session.productToBuy.name)}\n` +
    `🔢 *Qty:* ${session.quantity}\n` +
    `💵 *Amount:* \`${formatCurrency(session.total)}\`\n` +
    `🏦 *Bank:* PalmPay Limited\n` +
    `🧾 *Ref:* \`${session.transactionRef || 'N/A'}\`\n` +
    `📅 *Date:* ${formatDate(new Date())}\n` +
    `⏳ *Status:* PENDING\n\n` +
    `🆔 *Order:* \`${orderId}\`\n` +
    `━━━━━━━━━━━━━━━`;

  const adminKeyboard = Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ APPROVE', `admin_approve_${orderId}`),
      Markup.button.callback('❌ REJECT', `admin_reject_${orderId}`),
    ],
  ]);

  for (const adminId of ADMIN_CHAT_IDS) {
    try {
      await bot.telegram.sendMessage(adminId, adminText, { 
        parse_mode: 'MarkdownV2',
        ...adminKeyboard 
      });
      await bot.telegram.sendPhoto(adminId, fileId, {
        caption: `📸 Payment proof for order ${orderId}`,
      });
    } catch (e) {
      console.error(`Failed to notify admin ${adminId}:`, e);
    }
  }

  // Send to log channel
  try {
    await bot.telegram.sendMessage(LOG_CHANNEL, adminText, { 
      parse_mode: 'MarkdownV2',
      ...adminKeyboard 
    });
  } catch (e) {}

  // Clear session
  userSessions.delete(userId);

  await ctx.reply(
    `✅ *Order Placed Successfully!*\n\n` +
    `🆔 *Order ID:* \`${orderId}\`\n` +
    `📦 *Product:* ${escapeMarkdown(session.productToBuy.name)}\n` +
    `💰 *Total:* \`${formatCurrency(session.total)}\`\n\n` +
    `⏳ *Your payment is being verified...*\n` +
    `You'll receive your product once confirmed.\n\n` +
    `🛠 *Support:* @lorddermott3306 | @anointed_hub`,
    { parse_mode: 'MarkdownV2', ...mainMenu }
  );
});

// ============== MY ORDERS ==============
bot.action('my_orders', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  let orders;
  try {
    orders = await Order.find({ telegramId: userId }).sort({ createdAt: -1 }).limit(10);
  } catch (e) {
    orders = [];
  }

  if (!orders || orders.length === 0) {
    await ctx.editMessageText(
      '📭 *You have no orders yet.*\n\nStart shopping! 🛍️',
      { parse_mode: 'MarkdownV2', ...Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Browse Products', 'browse_products')],
        [Markup.button.callback('⬅️ Back', 'main_menu')],
      ])}
    );
    return;
  }

  let text = '📦 *Your Orders*\n\n';
  for (const order of orders) {
    const statusEmoji = {
      pending: '⏳',
      paid: '✅',
      processing: '🔄',
      delivered: '📬',
      cancelled: '❌',
      rejected: '🚫',
    }[order.status] || '⏳';

    text += `${statusEmoji} *${order.orderId}*\n`;
    text += `📦 ${escapeMarkdown(order.products?.[0]?.name || 'N/A')}\n`;
    text += `💵 \`${formatCurrency(order.totalAmount)}\`\n`;
    text += `📊 ${order.status.toUpperCase()}\n\n`;
  }

  await ctx.editMessageText(text, {
    parse_mode: 'MarkdownV2',
    ...backToMenu,
  });
});

// ============== SUPPORT ==============
bot.action('support', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `💬 *Customer Support*\n\n` +
    `Need help? Contact our admins:\n\n` +
    `👤 @lorddermott3306\n` +
    `👤 @anointed_hub\n\n` +
    `📢 Channel: https://t.me/home_of_socials_logz\n\n` +
    `⏰ Response time: Usually within 1 hour`,
    {
      parse_mode: 'MarkdownV2',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📢 Join Channel', 'https://t.me/home_of_socials_logz')],
        [Markup.button.callback('⬅️ Back', 'main_menu')],
      ]),
    }
  );
});

// ============== ABOUT ==============
bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `🏠 *Home of Social*\n\n` +
    `Your trusted source for:\n` +
    `• Social Media Accounts\n` +
    `• VPN Services\n` +
    `• Streaming Accounts\n` +
    `• Digital Products\n\n` +
    `💳 Secure payments via PalmPay\n` +
    `⚡ Fast delivery after verification\n` +
    `🛡️ Trusted by 1000+ customers\n\n` +
    `📧 homeofsocial@gmail.com`,
    {
      parse_mode: 'MarkdownV2',
      ...backToMenu,
    }
  );
});

// ============== MAIN MENU ==============
bot.action('main_menu', async (ctx) => {
  await ctx.answerCbQuery();

  const welcomeText = `👋 *Welcome back to Home of Social!*\n\n` +
    `🏆 *Premium Digital Marketplace*\n\n` +
    `🛍️ *What we offer:*\n` +
    `• Social Media Accounts\n` +
    `• VPN Services\n` +
    `• Streaming Accounts\n` +
    `• Digital Products\n\n` +
    `💳 *Secure Payments via PalmPay*\n` +
    `👤 *Account:* ANOINTED IFECHIDERE ACHILEFU\n` +
    `🔢 *Number:* \`9035509566\`\n\n` +
    `⚡ *Fast Delivery • 24/7 Support • Premium Quality*`;

  await ctx.editMessageText(welcomeText, {
    parse_mode: 'MarkdownV2',
    ...mainMenu,
  });
});

// ============== ADMIN COMMANDS ==============
bot.command('admin', async (ctx) => {
  const username = ctx.from.username;
  if (!ADMIN_CHAT_IDS.includes(username || '')) {
    await ctx.reply('❌ You are not authorized to use admin commands.');
    return;
  }

  const text = `🔐 *Admin Panel*\n\n` +
    `Commands:\n` +
    `/orders — View pending orders\n` +
    `/approve <orderId> — Approve order\n` +
    `/reject <orderId> — Reject order\n` +
    `/stats — Sales statistics\n` +
    `/products — Manage products\n` +
    `/broadcast <message> — Send to all users`;

  await ctx.reply(text, { parse_mode: 'MarkdownV2' });
});

bot.command('orders', async (ctx) => {
  const username = ctx.from.username;
  if (!ADMIN_CHAT_IDS.includes(username || '')) return;

  let orders;
  try {
    orders = await Order.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(20);
  } catch (e) {
    orders = [];
  }

  if (!orders || orders.length === 0) {
    await ctx.reply('✅ No pending orders.');
    return;
  }

  for (const order of orders) {
    const text = `🛒 *Order ${order.orderId}*\n\n` +
      `📦 Product: ${escapeMarkdown(order.products?.[0]?.name || 'N/A')}\n` +
      `💵 Amount: \`${formatCurrency(order.totalAmount)}\`\n` +
      `👤 User: @${order.telegramUsername || 'N/A'}\n` +
      `📅 Date: ${formatDate(order.createdAt)}\n\n` +
      `Actions:`;

    const keyboard = Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Approve', `admin_approve_${order.orderId}`),
        Markup.button.callback('❌ Reject', `admin_reject_${order.orderId}`),
      ],
    ]);

    await ctx.reply(text, { parse_mode: 'MarkdownV2', ...keyboard });
  }
});

bot.command('stats', async (ctx) => {
  const username = ctx.from.username;
  if (!ADMIN_CHAT_IDS.includes(username || '')) return;

  let stats;
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const totalRevenue = await Order.aggregate([
      { $match: { status: { $in: ['paid', 'delivered'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    stats = {
      totalOrders,
      pendingOrders,
      revenue: totalRevenue[0]?.total || 0,
    };
  } catch (e) {
    stats = { totalOrders: 0, pendingOrders: 0, revenue: 0 };
  }

  await ctx.reply(
    `📊 *Sales Stats*\n\n` +
    `📦 Total Orders: ${stats.totalOrders}\n` +
    `⏳ Pending: ${stats.pendingOrders}\n` +
    `💰 Revenue: \`${formatCurrency(stats.revenue)}\``,
    { parse_mode: 'MarkdownV2' }
  );
});

// Admin approve/reject actions
bot.action(/admin_approve_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  const username = ctx.from.username;
  if (!ADMIN_CHAT_IDS.includes(username || '')) return;

  try {
    const order = await Order.findOneAndUpdate(
      { orderId },
      { status: 'paid', paymentStatus: 'verified', approvedBy: username },
      { new: true }
    );

    if (!order) {
      await ctx.reply('❌ Order not found.');
      return;
    }

    // Create delivery record
    await Delivery.create({
      orderId,
      telegramId: order.telegramId,
      productName: order.products?.[0]?.name,
      status: 'pending',
      deliveredBy: username,
    });

    // Notify user
    try {
      await bot.telegram.sendMessage(
        order.telegramId,
        `🎉 *Payment Verified!*\n\n` +
        `🆔 Order ID: \`${orderId}\`\n` +
        `✅ Status: APPROVED\n\n` +
        `⏳ Your product is being prepared for delivery...\n` +
        `You'll receive login credentials shortly!\n\n` +
        `Thank you for shopping with Home of Social 🏠`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (e) {}

    // Notify other admin
    const otherAdmin = ADMIN_CHAT_IDS.find(id => id !== username);
    if (otherAdmin) {
      try {
        await bot.telegram.sendMessage(
          otherAdmin,
          `✅ *Order Approved by @${username}*\n\n` +
          `🆔 Order: \`${orderId}\`\n` +
          `📦 Product: ${escapeMarkdown(order.products?.[0]?.name || 'N/A')}\n` +
          `👤 User: @${order.telegramUsername || 'N/A'}\n\n` +
          `Please prepare delivery credentials.`,
          { parse_mode: 'MarkdownV2' }
        );
      } catch (e) {}
    }

    await ctx.reply(`✅ Order ${orderId} approved. Delivery pending.`);
  } catch (e) {
    await ctx.reply('❌ Error approving order.');
  }
});

bot.action(/admin_reject_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const orderId = ctx.match[1];
  const username = ctx.from.username;
  if (!ADMIN_CHAT_IDS.includes(username || '')) return;

  try {
    const order = await Order.findOneAndUpdate(
      { orderId },
      { status: 'rejected', paymentStatus: 'rejected', approvedBy: username },
      { new: true }
    );

    if (!order) {
      await ctx.reply('❌ Order not found.');
      return;
    }

    // Restore stock
    try {
      for (const item of order.products || []) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
      }
    } catch (e) {}

    // Notify user
    try {
      await bot.telegram.sendMessage(
        order.telegramId,
        `❌ *Order Rejected*\n\n` +
        `🆔 Order ID: \`${orderId}\`\n` +
        `Your payment could not be verified.\n\n` +
        `Please contact support:\n` +
        `@lorddermott3306 or @anointed_hub`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (e) {}

    await ctx.reply(`❌ Order ${orderId} rejected and user notified.`);
  } catch (e) {
    await ctx.reply('❌ Error rejecting order.');
  }
});

// ============== ERROR HANDLING ==============
bot.catch((err: any, ctx: Context) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ Something went wrong. Please try again or contact support.').catch(() => {});
});

// ============== HEALTH CHECK SERVER ==============
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'OK', 
      bot: 'Home of Social',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  } else if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>🏠 Home of Social Bot is Running!</h1><p>Bot: @Home_of_socials_logz_bot</p>');
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// ============== LAUNCH ==============
async function startBot() {
  await connectDB();

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
  });

  const webhookUrl = process.env.WEBHOOK_URL;

  if (webhookUrl && webhookUrl !== 'https://your-app.onrender.com/webhook') {
    await bot.launch({
      webhook: {
        domain: webhookUrl.replace('/webhook', ''),
        port: PORT,
        hookPath: '/webhook',
      },
    });
    console.log('🤖 Bot running with WEBHOOK');
  } else {
    await bot.launch({
      polling: {
        allowedUpdates: ['message', 'callback_query'],
      },
      dropPendingUpdates: true,
    });
    console.log('🤖 Bot running with POLLING');
  }

  console.log('📢 Channel: https://t.me/home_of_socials_logz');
  console.log('👤 Admins: @lorddermott3306, @anointed_hub');

  process.once('SIGINT', () => {
    bot.stop('SIGINT');
    server.close();
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    server.close();
  });
}

startBot().catch(console.error);
