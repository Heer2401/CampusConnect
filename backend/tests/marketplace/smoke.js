const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
process.env.LISTING_AUTO_APPROVE = 'true';
const app = require('../../src/app');
const seedCategories = require('../../src/utils/seedCategories');
const Category = require('../../src/models/Category');
const Listing = require('../../src/models/Listing');
const User = require('../../src/models/User');
const jwt = require('jsonwebtoken');

(async () => {
  console.log('=== STARTING END-TO-END SMOKE TEST ===');
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, { driverInfo: { name: 'nodejs', version: '6.0.0' } });
  console.log('[1/7] In-memory database connected.');

  // 1. Seed categories
  await seedCategories();
  const catCount = await Category.countDocuments();
  console.log(`[2/7] Seeded categories: ${catCount} categories created.`);

  // 2. Create test user and token
  const user = await User.create({
    name: 'Nishka Shah',
    email: 'nishka.smoke@campus.edu',
    password: 'password123',
    role: 'Student'
  });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'campusconnect_jwt_secret');
  console.log('[3/7] Created test user and generated JWT token.');

  // 3. Start server on dynamic port
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;
  console.log(`[4/7] Backend HTTP server listening on port ${port}.`);

  const booksCat = await Category.findOne({ slug: 'books-textbooks' });
  const gadgetsCat = await Category.findOne({ slug: 'electronics-gadgets' });
  const hostelCat = await Category.findOne({ slug: 'hostel-room-essentials' });

  // 4. Create one listing of each type
  // Type: Sell
  const resSell = await fetch(`${baseUrl}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Calculus 8th Edition',
      description: 'Used calculus textbook in great condition',
      category: booksCat._id,
      listingType: 'sell',
      price: 450,
      condition: 'good',
      tags: ['calculus', 'math']
    })
  });
  const sellData = await resSell.json();
  if (!sellData.success) throw new Error(`Sell listing failed: ${JSON.stringify(sellData)}`);
  console.log(`[5/7] Created Sell listing: ID = ${sellData.data._id}, Price = ₹${sellData.data.price}`);

  // Type: Rent
  const resRent = await fetch(`${baseUrl}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Scientific Calculator fx-991',
      description: 'Calculator available for weekly rent',
      category: gadgetsCat._id,
      listingType: 'rent',
      rentalRate: 25,
      rentalPeriod: 'week',
      deposit: 150,
      condition: 'like_new'
    })
  });
  const rentData = await resRent.json();
  if (!rentData.success) throw new Error(`Rent listing failed: ${JSON.stringify(rentData)}`);
  console.log(`      Created Rent listing: ID = ${rentData.data._id}, Rate = ₹${rentData.data.rentalRate}/${rentData.data.rentalPeriod}`);

  // Type: Exchange
  const resExchange = await fetch(`${baseUrl}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Engineering Mechanics Notes',
      description: 'Full semester 2 notes',
      category: booksCat._id,
      listingType: 'exchange',
      exchangeFor: 'Algorithms notes or textbook',
      condition: 'good'
    })
  });
  const exchangeData = await resExchange.json();
  if (!exchangeData.success) throw new Error(`Exchange listing failed: ${JSON.stringify(exchangeData)}`);
  console.log(`      Created Exchange listing: ID = ${exchangeData.data._id}`);

  // Type: Giveaway
  const resGiveaway = await fetch(`${baseUrl}/listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      title: 'Study Desk Lamp',
      description: 'Working desk lamp given away for free',
      category: hostelCat._id,
      listingType: 'giveaway',
      condition: 'fair'
    })
  });
  const giveawayData = await resGiveaway.json();
  if (!giveawayData.success) throw new Error(`Giveaway listing failed: ${JSON.stringify(giveawayData)}`);
  console.log(`      Created Giveaway listing: ID = ${giveawayData.data._id}, Price = ₹${giveawayData.data.price}`);

  // 5. Browse & Filter
  const browseRes = await fetch(`${baseUrl}/listings?listingType=sell&sort=newest`);
  const browseData = await browseRes.json();
  if (!browseData.success || browseData.data.length !== 1) {
    throw new Error(`Browse filter failed: expected 1 item, got ${browseData.data?.length}`);
  }
  console.log(`[6/7] Browse filter check: found ${browseData.data.length} sell items, total = ${browseData.meta.total}.`);

  // 6. Update listing
  const updateRes = await fetch(`${baseUrl}/listings/${sellData.data._id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ price: 400 })
  });
  const updateData = await updateRes.json();
  if (!updateData.success || updateData.data.price !== 400) {
    throw new Error(`Update listing failed: ${JSON.stringify(updateData)}`);
  }
  console.log(`[7/7] Updated listing price to ₹${updateData.data.price}`);

  // 7. Delete listing
  const delRes = await fetch(`${baseUrl}/listings/${giveawayData.data._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const delData = await delRes.json();
  if (!delData.success) throw new Error(`Delete listing failed: ${JSON.stringify(delData)}`);
  console.log(`      Soft-deleted giveaway listing: success = ${delData.success}`);

  // Cleanup
  server.close();
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('=== END-TO-END SMOKE TEST PASSED 100% ===');
  process.exit(0);
})().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
