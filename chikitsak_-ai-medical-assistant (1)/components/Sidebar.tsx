
import React, { useState, useRef, useEffect } from 'react';
import { Conversation } from '../types.ts';
import { BotIcon, NewChatIcon, TrashIcon, EditIcon, ShareIcon, CheckIcon } from './icons.tsx';

interface HistoryItemProps {
    conversation: Conversation;
    isActive: boolean;
    onSelect: (id: string) => void;
    onRename: (id: string, newTitle: string) => void;
    onDelete: (id: string) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ conversation, isActive, onSelect, onRename, onDelete }) => {
    const [isRenaming, setIsRenaming] = useState(false);
    const [title, setTitle] = useState(conversation.title);
    const [showCopied, setShowCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isRenaming]);
    
    const handleRename = () => {
        if (title.trim()) {
            onRename(conversation.id, title.trim());
        } else {
            setTitle(conversation.title); // revert if empty
        }
        setIsRenaming(false);
    };

    const handleShare = () => {
        const shareText = conversation.messages
            .filter(m => m.id !== 'initial-message')
            .map(m => `${m.role === 'user' ? 'You' : 'Chikitsak'}: ${m.text}`)
            .join('\n\n');
        
        navigator.clipboard.writeText(shareText).then(() => {
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        });
    };
    
    return (
        <div 
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-primary-100 dark:bg-primary-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
            onClick={() => onSelect(conversation.id)}
        >
            {isRenaming ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    className="flex-1 bg-transparent focus:outline-none text-sm"
                />
            ) : (
                <p className="flex-1 truncate text-sm">{conversation.title}</p>
            )}

            <div className={`absolute right-2 flex items-center gap-1.5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {isRenaming ? (
                     <button onClick={handleRename} className="p-1 hover:text-primary-600"><CheckIcon className="w-4 h-4" /></button>
                ) : (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }} className="p-1 hover:text-primary-600"><EditIcon className="w-4 h-4" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-1 hover:text-primary-600">
                             {showCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ShareIcon className="w-4 h-4" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Are you sure you want to delete this chat?')) { onDelete(conversation.id); } }} className="p-1 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                    </>
                )}
            </div>
        </div>
    );
};

interface SidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectChat: (id: string) => void;
    onNewChat: () => void;
    onRenameChat: (id: string, newTitle: string) => void;
    onDeleteChat: (id: string) => void;
    onClearHistory: () => void;
    isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ conversations, activeConversationId, onSelectChat, onNewChat, onRenameChat, onDeleteChat, onClearHistory, isOpen }) => {
    return (
        <aside className={`absolute md:relative z-20 flex flex-col h-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 transition-transform transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-64 md:w-80 border-r border-gray-200 dark:border-gray-700 flex-shrink-0`}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <BotIcon className="h-8 w-8 text-brand-DEFAULT" />
                    <h1 className="text-xl font-bold">Chikitsak</h1>
                </div>
                <button onClick={onNewChat} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="New Chat">
                    <NewChatIcon className="w-6 h-6" />
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.map(convo => (
                    <HistoryItem
                        key={convo.id}
                        conversation={convo}
                        isActive={convo.id === activeConversationId}
                        onSelect={onSelectChat}
                        onRename={onRenameChat}
                        onDelete={onDeleteChat}
                    />
                ))}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => { if(window.confirm('Are you sure you want to clear all chat history? This cannot be undone.')) { onClearHistory(); } }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                >
                    <TrashIcon className="w-4 h-4" />
                    Clear All History
                </button>
            </div>
        </aside>
    );
};