import { createPDFReport } from './lib/pdf-export';

// Тестові дані
const testData = {
  positionLevel: "Senior Business Analyst",
  questions: [
    {
      competency: "Аналіз вимог",
      questions: [
        "Чи маєте ви досвід збору та аналізу бізнес-вимог?",
        "Чи вмієте ви працювати з різними стейкхолдерами?",
        "Чи знаєте ви методології аналізу вимог?"
      ],
      answers: [5, 4, 3]
    },
    {
      competency: "Моделювання процесів",
      questions: [
        "Чи маєте ви досвід створення діаграм бізнес-процесів?",
        "Чи знаєте ви нотації BPMN або UML?",
        "Чи вмієте ви оптимізувати бізнес-процеси?"
      ],
      answers: [4, 5, 4]
    },
    {
      competency: "Управління проектами",
      questions: [
        "Чи маєте ви досвід роботи в Agile/Scrum командах?",
        "Чи вмієте ви планувати та контролювати виконання завдань?",
        "Чи знаєте ви інструменти управління проектами?"
      ],
      answers: [3, 4, 2]
    }
  ]
};

// Тестування функції
async function testPDFExport() {
  try {
    console.log("🧪 Тестування функції createPDFReport...");
    
    const result = await createPDFReport(testData, "test-report.pdf");
    
    console.log("✅ PDF успішно створено!");
    console.log("📄 Результат (перші 100 символів):", result.substring(0, 100) + "...");
    
    // Перевіряємо, що результат є base64 строкою
    if (result.startsWith("data:application/pdf;base64,")) {
      console.log("✅ Формат результату правильний (base64 PDF)");
    } else {
      console.log("❌ Неправильний формат результату");
    }
    
  } catch (error) {
    console.error("❌ Помилка тестування:", error);
  }
}

// Запускаємо тест
testPDFExport();