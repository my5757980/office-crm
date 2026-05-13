import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const MONGODB_URI = "mongodb+srv://my5757980_db_user:PtWBsjDZfm5Myrlc@cluster0.1cevg8j.mongodb.net/office-crm?appName=Cluster0";

const users = [
  { name: "Admin",   email: "admin@sbk.com",   password: "Admin@SBK1",   role: "admin" },
  { name: "Manager", email: "manager@sbk.com", password: "Manager@SBK1", role: "manager" },
];

const client = new MongoClient(MONGODB_URI);

async function seed() {
  await client.connect();
  const db = client.db("office-crm");
  const col = db.collection("users");

  for (const u of users) {
    const exists = await col.findOne({ email: u.email });
    if (exists) { console.log(`Already exists: ${u.email}`); continue; }
    const hashed = await bcrypt.hash(u.password, 12);
    await col.insertOne({ name: u.name, email: u.email, password: hashed, role: u.role, createdAt: new Date(), updatedAt: new Date() });
    console.log(`Created: ${u.email} (${u.role})`);
  }

  await client.close();
  console.log("Done!");
}

seed().catch(console.error);
