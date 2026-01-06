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
  const categoriesData = [
    { name: 'Food', kind: 'EXPENSE', color: '#FF5733' },
    { name: 'Transport', kind: 'EXPENSE', color: '#33FF57' },
    { name: 'Salary', kind: 'INCOME', color: '#3357FF' },
    { name: 'Rent', kind: 'EXPENSE', color: '#FF33A1' },
    { name: 'Utilities', kind: 'EXPENSE', color: '#FFC300' },
    { name: 'Entertainment', kind: 'EXPENSE', color: '#C70039' },
    { name: 'Shopping', kind: 'EXPENSE', color: '#900C3F' },
    { name: 'Healthcare', kind: 'EXPENSE', color: '#581845' },
    { name: 'Freelance', kind: 'INCOME', color: '#28B463' },
  ]
  
  const categories: any[] = []
  for (const cat of categoriesData) {
    const category = await prisma.category.create({
      data: { ...cat, householdId: household.id }
    })
    categories.push(category)
  }

  // Get accounts for transactions
  const accounts = await prisma.account.findMany({
    where: { householdId: household.id }
  })

  // Helper function to get random date in the past N months
  const getRandomDate = (monthsAgo: number) => {
    const now = new Date()
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(Math.random() * 28) + 1)
    return date
  }

  // Helper to get category by name
  const getCategoryByName = (name: string) => categories.find(c => c.name === name)

  // Seed Transactions - Last 6 months of data
  const transactions = [
    // Current Month
    { amount: -2500, type: 'EXPENSE', categoryId: getCategoryByName('Food')?.id, accountId: accounts[0]?.id, date: getRandomDate(0), description: 'Grocery shopping at BigBasket', userId: vinoth.id },
    { amount: -800, type: 'EXPENSE', categoryId: getCategoryByName('Transport')?.id, accountId: accounts[0]?.id, date: getRandomDate(0), description: 'Uber rides', userId: vinoth.id },
    { amount: 75000, type: 'INCOME', categoryId: getCategoryByName('Salary')?.id, accountId: accounts[0]?.id, date: getRandomDate(0), description: 'Monthly salary', userId: vinoth.id },
    { amount: -25000, type: 'EXPENSE', categoryId: getCategoryByName('Rent')?.id, accountId: accounts[0]?.id, date: getRandomDate(0), description: 'Monthly rent payment', userId: vinoth.id },
    { amount: -1500, type: 'EXPENSE', categoryId: getCategoryByName('Utilities')?.id, accountId: accounts[1]?.id, date: getRandomDate(0), description: 'Electricity bill', userId: vinoth.id },
    { amount: -3200, type: 'EXPENSE', categoryId: getCategoryByName('Entertainment')?.id, accountId: accounts[0]?.id, date: getRandomDate(0), description: 'Movie and dinner', userId: vinoth.id },
    
    // 1 Month Ago
    { amount: -3000, type: 'EXPENSE', categoryId: getCategoryByName('Food')?.id, accountId: accounts[0]?.id, date: getRandomDate(1), description: 'Grocery shopping', userId: vinoth.id },
    { amount: -1200, type: 'EXPENSE', categoryId: getCategoryByName('Transport')?.id, accountId: accounts[1]?.id, date: getRandomDate(1), description: 'Petrol', userId: vinoth.id },
    { amount: 75000, type: 'INCOME', categoryId: getCategoryByName('Salary')?.id, accountId: accounts[0]?.id, date: getRandomDate(1), description: 'Monthly salary', userId: vinoth.id },
    { amount: -25000, type: 'EXPENSE', categoryId: getCategoryByName('Rent')?.id, accountId: accounts[0]?.id, date: getRandomDate(1), description: 'Monthly rent payment', userId: vinoth.id },
    { amount: -4500, type: 'EXPENSE', categoryId: getCategoryByName('Shopping')?.id, accountId: accounts[1]?.id, date: getRandomDate(1), description: 'Amazon shopping', userId: vinoth.id },
    { amount: -2800, type: 'EXPENSE', categoryId: getCategoryByName('Entertainment')?.id, accountId: accounts[0]?.id, date: getRandomDate(1), description: 'Concert tickets', userId: vinoth.id },
    { amount: 15000, type: 'INCOME', categoryId: getCategoryByName('Freelance')?.id, accountId: accounts[1]?.id, date: getRandomDate(1), description: 'Freelance project', userId: vinoth.id },
    
    // 2 Months Ago
    { amount: -2800, type: 'EXPENSE', categoryId: getCategoryByName('Food')?.id, accountId: accounts[0]?.id, date: getRandomDate(2), description: 'Grocery and vegetables', userId: vinoth.id },
    { amount: -900, type: 'EXPENSE', categoryId: getCategoryByName('Transport')?.id, accountId: accounts[0]?.id, date: getRandomDate(2), description: 'Auto and bus fare', userId: vinoth.id },
    { amount: 75000, type: 'INCOME', categoryId: getCategoryByName('Salary')?.id, accountId: accounts[0]?.id, date: getRandomDate(2), description: 'Monthly salary', userId: vinoth.id },
    { amount: -25000, type: 'EXPENSE', categoryId: getCategoryByName('Rent')?.id, accountId: accounts[0]?.id, date: getRandomDate(2), description: 'Monthly rent payment', userId: vinoth.id },
    { amount: -1800, type: 'EXPENSE', categoryId: getCategoryByName('Utilities')?.id, accountId: accounts[1]?.id, date: getRandomDate(2), description: 'Internet and mobile bills', userId: vinoth.id },
    { amount: -5000, type: 'EXPENSE', categoryId: getCategoryByName('Healthcare')?.id, accountId: accounts[1]?.id, date: getRandomDate(2), description: 'Medical checkup', userId: vinoth.id },
    
    // 3 Months Ago
    { amount: -3500, type: 'EXPENSE', categoryId: getCategoryByName('Food')?.id, accountId: accounts[0]?.id, date: getRandomDate(3), description: 'Monthly groceries', userId: vinoth.id },
    { amount: -1100, type: 'EXPENSE', categoryId: getCategoryByName('Transport')?.id, accountId: accounts[0]?.id, date: getRandomDate(3), description: 'Cab fares', userId: vinoth.id },
    { amount: 75000, type: 'INCOME', categoryId: getCategoryByName('Salary')?.id, accountId: accounts[0]?.id, date: getRandomDate(3), description: 'Monthly salary', userId: vinoth.id },
    { amount: -25000, type: 'EXPENSE', categoryId: getCategoryByName('Rent')?.id, accountId: accounts[0]?.id, date: getRandomDate(3), description: 'Monthly rent payment', userId: vinoth.id },
    { amount: -6000, type: 'EXPENSE', categoryId: getCategoryByName('Shopping')?.id, accountId: accounts[1]?.id, date: getRandomDate(3), description: 'Clothing shopping', userId: vinoth.id },
    { amount: -2000, type: 'EXPENSE', categoryId: getCategoryByName('Entertainment')?.id, accountId: accounts[0]?.id, date: getRandomDate(3), description: 'Restaurant dining', userId: vinoth.id },
    { amount: 20000, type: 'INCOME', categoryId: getCategoryByName('Freelance')?.id, accountId: accounts[1]?.id, date: getRandomDate(3), description: 'Consulting work', userId: vinoth.id },
    
    // 4 Months Ago
    { amount: -2900, type: 'EXPENSE', categoryId: getCategoryByName('Food')?.id, accountId: accounts[0]?.id, date: getRandomDate(4), description: 'Groceries from supermarket', userId: vinoth.id },
    { amount: -1300, type: 'EXPENSE', categoryId: getCategoryByName('Transport')?.id, accountId: accounts[1]?.id, date: getRandomDate(4), description: 'Fuel and parking', userId: vinoth.id },
    { amount: 75000, type: 'INCOME', categoryId: getCategoryByName('Salary')?.id, accountId: accounts[0]?.id, date: getRandomDate(4), description: 'Monthly salary', userId: vinoth.id },
    { amount: -25000, type: 'EXPENSE', categoryId: getCategoryByName('Rent')?.id, accountId: accounts[0]?.id, date: getRandomDate(4), description: 'Monthly rent payment', userId: vinoth.id },
    { amount: -1600, type: 'EXPENSE', categoryId: getCategoryByName('Utilities')?.id, accountId: accounts[1]?.id, date: getRandomDate(4), description: 'Electricity and water', userId: vinoth.id },
    { amount: -3500, type: 'EXPENSE', categoryId: getCategoryByName('Entertainment')?.id, accountId: accounts[0]?.id, date: getRandomDate(4), description: 'Weekend outing', userId: vinoth.id },
    
    // 5 Months Ago
    { amount: -3200, type: 'EXPENSE', categoryId: getCategoryByName('Food')?.id, accountId: accounts[0]?.id, date: getRandomDate(5), description: 'Monthly provisions', userId: vinoth.id },
    { amount: -950, type: 'EXPENSE', categoryId: getCategoryByName('Transport')?.id, accountId: accounts[0]?.id, date: getRandomDate(5), description: 'Public transport', userId: vinoth.id },
    { amount: 75000, type: 'INCOME', categoryId: getCategoryByName('Salary')?.id, accountId: accounts[0]?.id, date: getRandomDate(5), description: 'Monthly salary', userId: vinoth.id },
    { amount: -25000, type: 'EXPENSE', categoryId: getCategoryByName('Rent')?.id, accountId: accounts[0]?.id, date: getRandomDate(5), description: 'Monthly rent payment', userId: vinoth.id },
    { amount: -7500, type: 'EXPENSE', categoryId: getCategoryByName('Healthcare')?.id, accountId: accounts[1]?.id, date: getRandomDate(5), description: 'Dental treatment', userId: vinoth.id },
    { amount: -4200, type: 'EXPENSE', categoryId: getCategoryByName('Shopping')?.id, accountId: accounts[1]?.id, date: getRandomDate(5), description: 'Electronics purchase', userId: vinoth.id },
    { amount: 10000, type: 'INCOME', categoryId: getCategoryByName('Freelance')?.id, accountId: accounts[1]?.id, date: getRandomDate(5), description: 'Side project payment', userId: vinoth.id },
  ]

  for (const txn of transactions) {
    if (txn.categoryId && txn.accountId) {
      await prisma.transaction.create({
        data: {
          amount: txn.amount,
          type: txn.type as any,
          categoryId: txn.categoryId,
          accountId: txn.accountId,
          createdBy: txn.userId,
          date: txn.date,
          description: txn.description,
        }
      })
    }
  }

  console.log('Seeding completed with transaction data!')
  console.log(`Created ${transactions.length} transactions across ${categoriesData.length} categories`)
  console.log('Test user: vinoth@example.com / password')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
