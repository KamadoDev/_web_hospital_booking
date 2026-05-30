import { prisma } from "../config/prisma.js";

const faqs = [
  {
    question: "Benh vien lam viec may gio?",
    answer: "Benh vien ho tro kham trong gio hanh chinh. Ban nen dat lich truoc de duoc sap xep khung gio phu hop.",
    keywords: ["gio lam viec", "lam viec may gio", "thoi gian lam viec", "gio mo cua"],
  },
  {
    question: "Toi dat lich kham nhu the nao?",
    answer: "Ban co the chon chuyen khoa, goi kham, bac si va khung gio con trong, sau do xac thuc OTP de hoan tat dat lich.",
    keywords: ["dat lich", "dat lich kham", "cach dat lich", "hen kham"],
  },
  {
    question: "Benh vien ho tro thanh toan nhu the nao?",
    answer: "He thong ho tro thanh toan tai quay va co kien truc san sang cho thanh toan online nhu MOMO hoac VNPAY khi cau hinh duoc kich hoat.",
    keywords: ["thanh toan", "hoa don", "momo", "vnpay", "chuyen khoan"],
  },
  {
    question: "Co ho tro bao hiem y te khong?",
    answer: "Mot so goi kham co the ho tro BHYT tuy theo chinh sach va thong tin the cua benh nhan. Ban nen mang theo the BHYT khi den kham.",
    keywords: ["bhyt", "bao hiem y te", "bao hiem", "the bao hiem"],
  },
  {
    question: "Toi tra cuu lich hen o dau?",
    answer: "Ban co the tra cuu lich hen bang so dien thoai da dung khi dat lich. Neu can ho tro them, hay lien he nhan vien tiep nhan.",
    keywords: ["tra cuu lich hen", "kiem tra lich hen", "lich hen", "ma dat lich"],
  },
  {
    question: "Toi co the huy lich kham khong?",
    answer: "Ban co the lien he nhan vien ho tro de huy hoac doi lich kham neu lich chua den thoi gian thuc hien.",
    keywords: ["huy lich", "doi lich", "huy lich kham", "doi lich kham"],
  },
];

async function seedChatbotFAQ() {
  for (const faq of faqs) {
    const existingFAQ = await prisma.chatbotFAQ.findFirst({
      where: {
        question: {
          equals: faq.question,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (existingFAQ) {
      await prisma.chatbotFAQ.update({
        where: { id: existingFAQ.id },
        data: {
          answer: faq.answer,
          keywords: faq.keywords,
          isActive: true,
        },
      });
      continue;
    }

    await prisma.chatbotFAQ.create({
      data: {
        ...faq,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${faqs.length} chatbot FAQs`);
}

seedChatbotFAQ()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
