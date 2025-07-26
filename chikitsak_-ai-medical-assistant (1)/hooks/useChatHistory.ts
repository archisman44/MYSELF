
import { useState, useEffect, useCallback } from 'react';
import { Conversation, ChatMessage } from '../types.ts';
import { INITIAL_MESSAGE } from '../constants.ts';
import { sendMessageToAI } from '../services/geminiService.ts';

const STORAGE_KEY = 'chikitsak-chat-history';

export const useChatHistory = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        try {
            const storedHistory = localStorage.getItem(STORAGE_KEY);
            if (storedHistory) {
                const parsedHistory = JSON.parse(storedHistory);
                setConversations(parsedHistory.conversations);
                setActiveConversationId(parsedHistory.activeConversationId);
            } else {
                startNewChat();
            }
        } catch (error) {
            console.error("Failed to load chat history from localStorage", error);
            startNewChat();
        }
    }, []);

    useEffect(() => {
        try {
            if (conversations.length > 0 && activeConversationId) {
                const stateToStore = {
                    conversations,
                    activeConversationId
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
            }
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
    }, [conversations, activeConversationId]);

    const activeConversation = conversations.find(c => c.id === activeConversationId);

    const startNewChat = useCallback(() => {
        const newConversation: Conversation = {
            id: `chat-${Date.now()}`,
            title: 'New Chat',
            messages: [INITIAL_MESSAGE],
            createdAt: Date.now(),
        };
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversation.id);
    }, []);
    
    const selectChat = (id: string) => {
        setActiveConversationId(id);
    };

    const addMessage = async (text: string, imageUrl?: string | null) => {
        if (!activeConversationId || isLoading) return;

        const newUserMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text,
            imageUrl: imageUrl || undefined,
        };
        
        const currentConvo = conversations.find(c => c.id === activeConversationId);
        const isFirstUserMessage = currentConvo?.messages.length === 1;
        const newTitle = text ? text.split(' ').slice(0, 5).join(' ') : 'Image Query';

        const updatedConversations = conversations.map(c => 
            c.id === activeConversationId
                ? { 
                    ...c, 
                    title: isFirstUserMessage ? newTitle : c.title,
                    messages: [...c.messages, newUserMessage] 
                  }
                : c
        );
        
        setConversations(updatedConversations);
        setIsLoading(true);

        const updatedConvo = updatedConversations.find(c => c.id === activeConversationId);

        try {
            const aiResponseText = await sendMessageToAI(updatedConvo?.messages ?? []);
            const newAiMessage: ChatMessage = {
                id: `model-${Date.now()}`,
                role: 'model',
                text: aiResponseText,
                feedback: null,
            };

            setConversations(prev => prev.map(c => 
                c.id === activeConversationId
                    ? { ...c, messages: [...c.messages, newAiMessage] }
                    : c
            ));
        } catch (error) {
             console.error("Failed to get AI response:", error);
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                role: 'model',
                text: "I'm sorry, an unexpected error occurred. Please try again later.",
            };
            setConversations(prev => prev.map(c => 
                c.id === activeConversationId
                    ? { ...c, messages: [...c.messages, errorMessage] }
                    : c
            ));
        } finally {
            setIsLoading(false);
        }
    };
    
    const regenerateResponse = async () => {
        if (!activeConversationId || isLoading || !activeConversation) return;
        
        // Find history up to the last user message to resend it
        const lastModelResponseIndex = activeConversation.messages.map(m => m.role).lastIndexOf('model');
        const historyForRegeneration = activeConversation.messages.slice(0, lastModelResponseIndex);
        
        if (historyForRegeneration.length === 0 || historyForRegeneration[historyForRegeneration.length-1].role !== 'user') return;
       

        setConversations(prev => prev.map(c => 
            c.id === activeConversationId
                ? { ...c, messages: historyForRegeneration }
                : c
        ));
        
        setIsLoading(true);

         try {
            const aiResponseText = await sendMessageToAI(historyForRegeneration);
            const newAiMessage: ChatMessage = {
                id: `model-${Date.now()}`,
                role: 'model',
                text: aiResponseText,
                feedback: null,
            };

            setConversations(prev => prev.map(c => 
                c.id === activeConversationId
                    ? { ...c, messages: [...historyForRegeneration, newAiMessage] }
                    : c
            ));
        } catch (error) {
             console.error("Failed to get AI response:", error);
            const errorMessage: ChatMessage = {
                id: `error-${Date.now()}`,
                role: 'model',
                text: "I'm sorry, an unexpected error occurred. Please try again later.",
            };
            setConversations(prev => prev.map(c => 
                c.id === activeConversationId
                    ? { ...c, messages: [...historyForRegeneration, errorMessage] }
                    : c
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const deleteChat = (id: string) => {
        const remainingConversations = conversations.filter(c => c.id !== id);
        setConversations(remainingConversations);
        if (activeConversationId === id) {
            if (remainingConversations.length > 0) {
                setActiveConversationId(remainingConversations.sort((a,b) => b.createdAt - a.createdAt)[0].id);
            } else {
                startNewChat();
            }
        }
    };

    const renameChat = (id: string, newTitle: string) => {
        setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
    };

    const clearHistory = () => {
        localStorage.removeItem(STORAGE_KEY);
        setConversations([]);
        setActiveConversationId(null);
        startNewChat();
    };
    
    const setFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
        if (!activeConversationId) return;
        
        const currentFeedback = conversations.find(c => c.id === activeConversationId)
            ?.messages.find(m => m.id === messageId)?.feedback;

        const isNewDislike = feedback === 'dislike' && currentFeedback !== 'dislike';

        setConversations(prev => prev.map(c => {
            if (c.id !== activeConversationId) return c;
            
            const newMessages = c.messages.map(m => {
                if(m.id === messageId) {
                    return {...m, feedback: currentFeedback === feedback ? null : feedback };
                }
                return m;
            });
            return {...c, messages: newMessages};
        }));
        
        if (isNewDislike) {
            regenerateResponse();
        }
    }

    return {
        conversations,
        activeConversation,
        isLoading,
        startNewChat,
        selectChat,
        addMessage,
        deleteChat,
        renameChat,
        clearHistory,
        setFeedback,
    };
};