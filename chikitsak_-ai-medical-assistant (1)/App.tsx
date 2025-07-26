
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from './types.ts';
import { useSpeech } from './useSpeech.ts';
import { useChatHistory } from './useChatHistory.ts';
import { Sidebar } from './Sidebar.tsx';
import { 
    BotIcon, UserIcon, MicrophoneIcon, SendIcon, SpeakerIcon, StopIcon, 
    ThumbsUpIcon, ThumbsDownIcon, MenuIcon, CloseIcon, PaperclipIcon 
} from './icons.tsx';

interface MessageProps {
    message: ChatMessage;
    onSpeak: (message: ChatMessage) => void;
    onFeedback: (messageId: string, feedback: 'like' | 'dislike') => void;
}

const Message: React.FC<MessageProps> = ({ message, onSpeak, onFeedback }) => {
    const isModel = message.role === 'model';
    const wrapperClasses = isModel ? "col-start-1 col-end-12 md:col-end-10" : "col-start-2 md:col-start-4 col-end-13";
    const bubbleClasses = isModel
        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg rounded-tl-none"
        : "bg-primary-600 dark:bg-primary-700 text-white rounded-lg rounded-br-none";
    const avatar = isModel ? <BotIcon className="h-8 w-8 text-brand-DEFAULT" /> : <UserIcon className="h-8 w-8 text-primary-500" />;

    const formattedText = message.text.split('\n').map((line, index, arr) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('- ')) {
            return <li key={index} className="ml-5 list-disc">{trimmedLine.substring(2)}</li>;
        }
        if(trimmedLine.length > 0) {
           return <p key={index} className={index < arr.length - 1 ? 'mb-2' : ''}>{line}</p>;
        }
        return null;
    });

    return (
        <div className={`grid grid-cols-12 gap-y-2`}>
            <div className={`${wrapperClasses} flex items-start gap-3`}>
                {isModel && <div className="flex-shrink-0">{avatar}</div>}
                <div className={`w-full flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
                    <div className={`p-4 shadow-md ${bubbleClasses}`}>
                        {message.imageUrl && (
                            <img src={message.imageUrl} alt="User upload" className="mb-3 rounded-lg max-w-xs max-h-64" />
                        )}
                        <div className="prose prose-sm max-w-none text-inherit">{formattedText}</div>
                         {isModel && message.id !== 'initial-message' && (
                            <div className="flex items-center gap-1 mt-3">
                                <button
                                    onClick={() => onSpeak(message)}
                                    className={`p-2 rounded-full transition-colors ${message.isSpeaking ? 'bg-red-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                    aria-label={message.isSpeaking ? "Stop speaking" : "Read message aloud"}
                                >
                                    {message.isSpeaking ? <StopIcon className="h-5 w-5"/> : <SpeakerIcon className="h-5 w-5"/>}
                                </button>
                                <button
                                    onClick={() => onFeedback(message.id, 'like')}
                                    className={`p-2 rounded-full transition-colors ${
                                        message.feedback === 'like' 
                                        ? 'bg-primary-100 dark:bg-primary-800 text-primary-600 dark:text-primary-300' 
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                    aria-label="Like response"
                                >
                                    <ThumbsUpIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => onFeedback(message.id, 'dislike')}
                                    className={`p-2 rounded-full transition-colors ${
                                        message.feedback === 'dislike' 
                                        ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' 
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                    aria-label="Dislike response and regenerate"
                                >
                                    <ThumbsDownIcon className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                {!isModel && <div className="flex-shrink-0">{avatar}</div>}
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [userInput, setUserInput] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const { conversations, activeConversation, isLoading, startNewChat, selectChat, addMessage, deleteChat, renameChat, clearHistory, setFeedback } = useChatHistory();

    const handleSpeechEnd = useCallback(() => {
        setSpeakingMessageId(null);
    }, []);

    const { isListening, startListening, stopListening, speak, cancelSpeaking, recognitionError } = useSpeech(setUserInput);

    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }, [activeConversation?.messages, isLoading]);
    
    useEffect(() => {
        if (isListening) {
             cancelSpeaking();
             setSpeakingMessageId(null);
        }
    }, [isListening, cancelSpeaking]);

    const handleSpeak = (message: ChatMessage) => {
        if (speakingMessageId === message.id) {
            cancelSpeaking();
            handleSpeechEnd();
        } else {
            cancelSpeaking(); 
            setSpeakingMessageId(message.id);
            speak(message.text, handleSpeechEnd);
        }
    };

    const handleSendMessage = async () => {
        const trimmedText = userInput.trim();
        if (!trimmedText && !imagePreview || isLoading) return;

        if (isListening) stopListening();
        
        cancelSpeaking();
        setSpeakingMessageId(null);
        
        await addMessage(trimmedText, imagePreview);
        setUserInput('');
        setImagePreview(null);
    };
    
    const handleMicClick = () => {
        if (isListening) {
            stopListening();
            if (userInput.trim()) {
                handleSendMessage();
            }
        } else {
            setUserInput('');
            setImagePreview(null);
            startListening();
        }
    };

    const handleFeedback = (messageId: string, feedback: 'like' | 'dislike') => {
        cancelSpeaking();
        setSpeakingMessageId(null);
        setFeedback(messageId, feedback);
    }
    
    const handleSelectChat = (id: string) => {
        selectChat(id);
        setSidebarOpen(false);
    }

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex h-screen max-w-7xl mx-auto bg-white dark:bg-gray-900 shadow-2xl rounded-lg overflow-hidden font-sans">
            <Sidebar 
                 isOpen={sidebarOpen}
                 conversations={conversations}
                 activeConversationId={activeConversation?.id || null}
                 onSelectChat={handleSelectChat}
                 onNewChat={startNewChat}
                 onRenameChat={renameChat}
                 onDeleteChat={deleteChat}
                 onClearHistory={clearHistory}
            />
            <div className="flex flex-col flex-1 relative">
                <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-brand-light dark:bg-brand-dark flex-shrink-0">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 md:hidden">
                        {sidebarOpen ? <CloseIcon className="h-6 w-6 text-brand-dark dark:text-white" /> : <MenuIcon className="h-6 w-6 text-brand-dark dark:text-white" />}
                    </button>
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-xl font-bold text-brand-dark dark:text-white truncate">{activeConversation?.title || 'Chat'}</h1>
                         <p className="text-sm text-gray-600 dark:text-gray-300">Your AI Medical Assistant</p>
                    </div>
                    <div className="w-8 md:hidden"></div>
                </header>

                <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-950">
                    {activeConversation?.messages.map((msg) => (
                        <Message 
                            key={msg.id} 
                            message={{...msg, isSpeaking: speakingMessageId === msg.id}} 
                            onSpeak={handleSpeak}
                            onFeedback={handleFeedback}
                        />
                    ))}
                    {isLoading && (
                       <div className="grid grid-cols-12 gap-y-2">
                            <div className="col-start-1 col-end-12 md:col-end-10 flex items-start gap-3">
                                <BotIcon className="h-8 w-8 text-brand-DEFAULT"/>
                                <div className="p-4 shadow-md bg-white dark:bg-gray-800 rounded-lg rounded-tl-none">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse-fast"></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse-fast [animation-delay:0.2s]"></div>
                                        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse-fast [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                       </div>
                    )}
                </main>

                <footer className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="relative">
                        {imagePreview && (
                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2 inline-block relative">
                                <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                                <button
                                    onClick={() => setImagePreview(null)}
                                    className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full p-0.5"
                                    aria-label="Remove image"
                                >
                                    <CloseIcon className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                disabled={isLoading}
                                aria-label="Attach image"
                            >
                                <PaperclipIcon className="h-6 w-6" />
                            </button>
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={isListening ? "Listening..." : "Type or speak your symptoms..."}
                                className="flex-1 w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-DEFAULT text-gray-900 dark:text-gray-100"
                                disabled={isLoading}
                                aria-describedby="mic-error"
                            />
                            <button
                                type="button"
                                onClick={handleMicClick}
                                className={`p-3 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}
                                disabled={isLoading}
                                aria-label={isListening ? "Stop listening" : "Start listening"}
                            >
                                <MicrophoneIcon className="h-6 w-6" />
                            </button>
                            <button
                                type="submit"
                                className="p-3 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300 dark:disabled:bg-primary-800 disabled:cursor-not-allowed transition-colors"
                                disabled={(!userInput.trim() && !imagePreview) || isLoading}
                                aria-label="Send message"
                            >
                                <SendIcon className="h-6 w-6" />
                            </button>
                        </form>
                        {recognitionError === 'not-allowed' && (
                            <p id="mic-error" className="text-xs text-red-600 dark:text-red-400 text-center mt-2">
                                Microphone access was denied. Please enable it in your browser settings to use voice input.
                            </p>
                        )}
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default App;
