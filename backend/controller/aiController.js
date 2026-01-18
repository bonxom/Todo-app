import { GoogleGenAI } from "@google/genai";
import Category from "../model/Category.js";
import Task from "../model/Task.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import dotenv from "dotenv";
dotenv.config();

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

export const generateTasks = async (req, res) => {
    try {
        const { userRequirement } = req.body;
        
        if (!userRequirement) {
            return res.status(400).json({ 
                success: false,
                message: "userRequirement is required" 
            });
        }

        // Get user's categories
        const userId = req.user._id;
        const categories = await Category.find({ userId });
        
        // Build category map for AI prompt
        const categoryMap = {};
        categories.forEach(category => {
            categoryMap[category.name] = category._id.toString();
        });

        const categoryNames = categories.map(c => c.name).join(", ");
        const categoryInfo = categories.length > 0 
            ? `Available categories: ${categoryNames}. Choose the most appropriate category or leave it empty if none fits.`
            : "No categories available yet.";

        // Define task schema dynamically
        const taskSchema = z.object({
            title: z.string().min(1).max(100).describe("Clear, concise task title"),
            description: z.string().max(500).optional().describe("Detailed task description"),
            priority: z.enum(['Low', 'Medium', 'High']).optional().describe("Task priority level"),
            categoryName: z.string().optional().nullable().describe(`Category name. ${categoryInfo}`),
            dueDate: z.string().optional().describe("Due date in ISO format (YYYY-MM-DD)"),
        });

        const today = new Date().toISOString().split('T')[0];
        const prompt = `Generate ONE single task (not an array) based on the following user requirement: "${userRequirement}". 

Available categories (choose ONE of these EXACT names, or leave null if none fits):
${categories.map(c => `- "${c.name}"`).join('\n')}

IMPORTANT: 
- Return a SINGLE TASK OBJECT, NOT an array
- For categoryName, you MUST use the EXACT category name from the list above (case-sensitive)
- Do NOT make up new category names. If uncertain, use null

Create ONE practical, actionable task with:
- title: brief and clear
- description: detailed explanation
- priority: Low, Medium, or High
- categoryName: one of the exact names listed above, or null
- dueDate: YYYY-MM-DD format if applicable (based on today: ${today})`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: zodToJsonSchema(taskSchema),
            },
        });

        const generatedTask = taskSchema.parse(JSON.parse(response.text));

        console.log("Generated task:", generatedTask);
        console.log("Category map:", categoryMap);
        
        // Validate and map categoryName to categoryId
        let categoryId = null;
        if (generatedTask.categoryName) {
            // Check exact match (case-sensitive)
            if (categoryMap[generatedTask.categoryName]) {
                categoryId = categoryMap[generatedTask.categoryName];
            } else {
                // Try case-insensitive match
                const categoryNameLower = generatedTask.categoryName.toLowerCase();
                const matchedCategory = categories.find(c => c.name.toLowerCase() === categoryNameLower);
                
                if (matchedCategory) {
                    categoryId = matchedCategory._id.toString();
                    console.log(`Matched category (case-insensitive): ${matchedCategory.name}`);
                } else {
                    console.warn(`Category "${generatedTask.categoryName}" not found. Available: ${categoryNames}`);
                    // Fallback to Uncategorized if exists
                    if (categoryMap['Uncategorized']) {
                        categoryId = categoryMap['Uncategorized'];
                        console.log('Using Uncategorized as fallback');
                    }
                }
            }
        }
        
        // Create and save the task to database
        const newTask = new Task({
            title: generatedTask.title,
            description: generatedTask.description || "",
            priority: generatedTask.priority || "Medium",
            status: "pending",
            categoryId: categoryId,
            dueDate: generatedTask.dueDate ? new Date(generatedTask.dueDate) : undefined,
        });

        const savedTask = await newTask.save();

        res.status(201).json({
            success: true,
            message: "Task generated successfully",
            data: savedTask
        });
    } catch (error) {
        console.error("Error generating task:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to generate task",
            error: error.message 
        });
    }
}

