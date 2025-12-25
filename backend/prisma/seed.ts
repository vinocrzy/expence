/// <reference types="node" />
// SQLite: Enums removed, using strings.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create Household
  const household = await prisma.household.create({
    data: {
      name: 'Vinoth Household',
    }
  })

  // Create Users
  const vinoth = await prisma.user.create({
    data: {
      email: 'vinoth@example.com',
      passwordHash: 'hashedpassword', // In real app, use bcrypt
      name: 'Vinoth',
      householdId: household.id,
      avatarUrl: 'https://i.pravatar.cc/150?u=vinoth'
    }
  })

  const wife = await prisma.user.create({
    data: {
      email: 'wife@example.com',
      passwordHash: 'hashedpassword',
      name: 'Wife',
      householdId: household.id,
      avatarUrl: 'https://i.pravatar.cc/150?u=wife'
    }
  })

  // Vinoth Accounts
  await prisma.account.createMany({
    data: [
      { name: 'HDFC Bank', type: 'BANK', householdId: household.id, userId: vinoth.id, balance: 50000 },
      { name: 'ICICI Bank', type: 'BANK', householdId: household.id, userId: vinoth.id, balance: 30000 },
      { name: 'SBI Bank', type: 'BANK', householdId: household.id, userId: vinoth.id, balance: 20000 },
      { name: 'HDFC Credit Card', type: 'CREDIT_CARD', householdId: household.id, userId: vinoth.id, balance: -15000 },
      { name: 'Amex Credit Card', type: 'CREDIT_CARD', householdId: household.id, userId: vinoth.id, balance: -5000 },
    ]
  })

  // Wife Accounts
  await prisma.account.create({
    data: { name: 'Wife SBI Bank', type: 'BANK', householdId: household.id, userId: wife.id, balance: 40000 }
  })

  // Joint/Household Cash Reserve
  await prisma.account.create({
    data: { name: 'Cash Reserve', type: 'CASH_RESERVE', householdId: household.id, userId: null, balance: 10000 }
  })

  // Loans
  await prisma.loan.create({
    data: {
        householdId: household.id,
        principal: 5000000,
        interestRate: 8.5,
        startDate: new Date(),
        tenureMonths: 240,
        emiAmount: 45000,
        outstandingPrincipal: 4900000,
        lender: 'HDFC Home Loan'
    }
  })

  // Categories
  const categories = [
    { name: 'Food', kind: 'EXPENSE', color: '#FF5733' },
    { name: 'Transport', kind: 'EXPENSE', color: '#33FF57' },
    { name: 'Salary', kind: 'INCOME', color: '#3357FF' },
    { name: 'Rent', kind: 'EXPENSE', color: '#FF33A1' },
  ]
  
  for (const cat of categories) {
    await prisma.category.create({
      data: { ...cat, householdId: household.id }
    })
  }

  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
