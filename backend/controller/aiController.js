import { GoogleGenAI } from "@google/genai";
import Category from "../model/Category.js";
import Task from "../model/Task.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import dotenv from "dotenv";
dotenv.config();

// The client gets the API key from the environment variable `GEMINI_API_KEY`.
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

export const generateTasksWithRequirement = async (req, res) => {
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
            ? `Available categories: ${categoryNames}. Choose the most appropriate category or pick the Uncategorized category.`
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
        const prompt = `Generate EXACTLY 3 tasks (as an array) based on the following user requirement: "${userRequirement}". 

Available categories (choose ONE of these EXACT names for each task or pick the "Uncategorized" category if none fit):
${categories.map(c => `- "${c.name}"`).join('\n')}

IMPORTANT: 
- Return an ARRAY of EXACTLY 3 TASK OBJECTS
- For categoryName, you MUST use the EXACT category name from the list above (case-sensitive)
- Do NOT make up new category names. If uncertain, use null
- Make each task unique and actionable

Create 3 practical, actionable tasks with:
- title: brief and clear
- description: detailed explanation
- priority: Low, Medium, or High
- categoryName: one of the exact names listed above, or null
- dueDate: YYYY-MM-DD format if applicable (based on today: ${today})`;

        const tasksArraySchema = z.array(taskSchema).length(3);

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: zodToJsonSchema(tasksArraySchema),
            },
        });

        const generatedTasks = tasksArraySchema.parse(JSON.parse(response.text));

        console.log("Generated tasks:", generatedTasks);
        console.log("Category map:", categoryMap);
        
        // Process and save all 3 tasks
        const savedTasks = [];
        
        for (const generatedTask of generatedTasks) {
            // Validate and map categoryName to categoryId
            let categoryId = null;
            if (generatedTask.categoryName) {
                // Check exact match (case-sensitive)
                if (categoryMap[generatedTask.categoryName]) {
                    categoryId = categoryMap[generatedTask.categoryName];
                } else {
                    const categoryNameLower = generatedTask.categoryName.toLowerCase();
                    const matchedCategory = categories.find(c => c.name.toLowerCase() === categoryNameLower);
                    
                    if (matchedCategory) {
                        categoryId = matchedCategory._id.toString();
                    } else {
                        if (categoryMap['Uncategorized']) {
                            categoryId = categoryMap['Uncategorized'];
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
            savedTasks.push(savedTask);
        }

        res.status(201).json({
            success: true,
            message: "3 tasks generated successfully",
            data: savedTasks
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

export const responseToUser = async (req, res) => {
    try {
        const { userInput } = req.body;
        if (!userInput) {
            return res.status(400).json({ 
                success: false,
                message: "userInput is required" 
            });
        }

        const sysInstruction = `You are a helpful assistant for a TodoApp your name is Đạt. 
Help users manage tasks, provide productivity tips, 
and answer questions about task organization, categories, priorities, and time management. 
If user want to auto generate tasks, advise them to use the task generation mode.
Provide short, clear, concise, and friendly responses.`;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: userInput, 
            config: {
                systemInstruction: sysInstruction,
            }
        });
        console.log(response.text);
        res.status(200).json({
            success: true,
            message: "Response generated successfully",
            data: response.text
        });
    } catch (error) {
        console.error("Error generating response:", error);
        res.status(500).json({ 
            success: false,
            message: "Failed to generate response",
            error: error.message 
        });
    }
}
