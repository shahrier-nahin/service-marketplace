/**
 * Seed script — populates the database with demo accounts and listings so a
 * reviewer can explore the app immediately without manual setup.
 *
 * Run with: npm run db:seed
 *
 * All seeded accounts use the password: password123
 */
import "dotenv/config";
import { db } from "../index";
import { users, vendorProfiles, services, orders } from "../schema";
import { hashPassword } from "../../lib/auth";
import { resolveServiceImage } from "../../lib/images";

async function main() {
  console.log("Seeding database...");

  const passwordHash = await hashPassword("password123");

  // --- Admin -----------------------------------------------------------
  const [admin] = await db
    .insert(users)
    .values({
      name: "Platform Admin",
      email: "admin@servicemarket.test",
      passwordHash,
      role: "ADMIN",
    })
    .returning();

  // --- Vendors -----------------------------------------------------------
  const vendorSeeds = [
    {
      name: "Acme Plumbing Co",
      email: "plumbing@servicemarket.test",
      businessName: "Acme Plumbing Co",
      description: "Licensed, insured plumbers serving the metro area since 2010.",
      category: "Home Repair",
      services: [
        { title: "Emergency Pipe Repair", description: "24/7 emergency plumbing repair for leaks and burst pipes.", category: "Plumbing", price: "89.99", durationMinutes: 90 },
        { title: "Drain Cleaning", description: "Professional drain snaking and hydro-jetting for clogged drains.", category: "Plumbing", price: "59.99", durationMinutes: 60 },
      ],
    },
    {
      name: "BrightSpark Electric",
      email: "electric@servicemarket.test",
      businessName: "BrightSpark Electric",
      description: "Residential and light-commercial electrical work, fully licensed.",
      category: "Home Repair",
      services: [
        { title: "Outlet & Switch Installation", description: "Safe installation or replacement of outlets, switches, and dimmers.", category: "Electrical", price: "75.00", durationMinutes: 60 },
        { title: "Whole-Home Wiring Inspection", description: "A full inspection of your home's wiring for safety and code compliance.", category: "Electrical", price: "149.00", durationMinutes: 120 },
      ],
    },
    {
      name: "GreenLeaf Landscaping",
      email: "landscaping@servicemarket.test",
      businessName: "GreenLeaf Landscaping",
      description: "Lawn care, garden design, and seasonal cleanup for residential properties.",
      category: "Outdoor",
      services: [
        { title: "Lawn Mowing & Edging", description: "Weekly or biweekly lawn maintenance, mowing, and edging.", category: "Landscaping", price: "45.00", durationMinutes: 45 },
        { title: "Garden Bed Design", description: "Custom garden bed design and planting consultation.", category: "Landscaping", price: "199.00", durationMinutes: 120 },
      ],
    },
    {
      name: "Pixel Perfect Studio",
      email: "design@servicemarket.test",
      businessName: "Pixel Perfect Studio",
      description: "Freelance graphic design for small businesses and startups.",
      category: "Professional Services",
      services: [
        { title: "Logo Design Package", description: "Three initial logo concepts with two rounds of revisions.", category: "Design", price: "250.00", durationMinutes: 480 },
        { title: "Business Card Design", description: "Print-ready business card design, double-sided.", category: "Design", price: "45.00", durationMinutes: 90 },
      ],
    },
  ];

  for (const v of vendorSeeds) {
    const [vendorUser] = await db
      .insert(users)
      .values({ name: v.name, email: v.email, passwordHash, role: "VENDOR" })
      .returning();

    const [profile] = await db
      .insert(vendorProfiles)
      .values({
        userId: vendorUser.id,
        businessName: v.businessName,
        description: v.description,
        category: v.category,
      })
      .returning();

    await db.insert(services).values(
      v.services.map((s) => ({
        vendorId: profile.id,
        title: s.title,
        description: s.description,
        category: s.category,
        price: s.price,
        imageUrl: resolveServiceImage(null, s.category),
        durationMinutes: s.durationMinutes,
      }))
    );
  }

  // --- End users -----------------------------------------------------------
  const [buyer1] = await db
    .insert(users)
    .values({
      name: "Jordan Customer",
      email: "buyer@servicemarket.test",
      passwordHash,
      role: "USER",
    })
    .returning();

  await db
    .insert(users)
    .values({
      name: "Sam Shopper",
      email: "sam@servicemarket.test",
      passwordHash,
      role: "USER",
    })
    .returning();

  // --- A sample completed order, so the dashboards aren't empty ---------
  const [firstService] = await db.select().from(services).limit(1);
  const [firstVendorProfile] = await db.select().from(vendorProfiles).limit(1);

  if (firstService && firstVendorProfile) {
    await db.insert(orders).values({
      buyerId: buyer1.id,
      serviceId: firstService.id,
      vendorId: firstVendorProfile.id,
      priceAtBooking: firstService.price,
      status: "COMPLETED",
      paymentStatus: "PAID",
      mockPaymentReference: "MOCK-SEED-0001",
    });
  }

  console.log("Seed complete.");
  console.log("");
  console.log("Demo accounts (all use password: password123)");
  console.log(`  Admin:  ${admin.email}`);
  for (const v of vendorSeeds) console.log(`  Vendor: ${v.email}`);
  console.log(`  User:   ${buyer1.email}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
