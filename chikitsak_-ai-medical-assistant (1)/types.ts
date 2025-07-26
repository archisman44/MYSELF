
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isSpeaking?: boolean;
  feedback?: 'like' | 'dislike' | null;
  imageUrl?: string; // To store Data URL of uploaded images
}

export interface Conversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    createdAt: number;
}