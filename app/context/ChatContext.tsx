'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  role?: 'system' | 'user' | 'other';
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: string[];
  status: 'active' | 'archived';
  messages: ChatMessage[];
  unreadCount: number;
  lastMessageAt?: string;
}

interface ChatContextType {
  rooms: ChatRoom[];
  sendMessage: (roomId: string, senderId: string, senderName: string, content: string) => void;
  createRoom: (name: string, participants: string[]) => ChatRoom;
  markAsRead: (roomId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const INITIAL_ROOMS: ChatRoom[] = [
  {
    id: 'room_1',
    name: '東京大学ラクロス部',
    participants: ['user_current', 'user_1', 'user_2'],
    status: 'active',
    unreadCount: 2,
    messages: [
      {
        id: 'msg_1',
        roomId: 'room_1',
        senderId: 'user_1',
        senderName: '太郎 (東京大学)',
        content: '来週の土曜日、マッチングしませんか？',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        role: 'other',
      },
      {
        id: 'msg_2',
        roomId: 'room_1',
        senderId: 'user_current',
        senderName: 'あなた',
        content: 'いいですね！何時からですか？',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        role: 'user',
      },
    ],
    lastMessageAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'room_2',
    name: '関西クラブチーム',
    participants: ['user_current', 'user_3'],
    status: 'active',
    unreadCount: 0,
    messages: [
      {
        id: 'msg_3',
        roomId: 'room_2',
        senderId: 'user_current',
        senderName: 'あなた',
        content: 'マッチングのお誘いをいただきありがとうございます。',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        role: 'user',
      },
    ],
    lastMessageAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [rooms, setRooms] = useState<ChatRoom[]>(INITIAL_ROOMS);

  // localStorage から読み込み
  useEffect(() => {
    const stored = localStorage.getItem('chatRooms');
    if (stored) {
      try {
        setRooms(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse chat rooms:', e);
      }
    }
  }, []);

  // localStorage に保存
  useEffect(() => {
    localStorage.setItem('chatRooms', JSON.stringify(rooms));
  }, [rooms]);

  const sendMessage = (roomId: string, senderId: string, senderName: string, content: string) => {
    setRooms((prevRooms) =>
      prevRooms.map((room) => {
        if (room.id === roomId) {
          return {
            ...room,
            messages: [
              ...room.messages,
              {
                id: `msg_${Date.now()}`,
                roomId,
                senderId,
                senderName,
                content,
                timestamp: new Date().toISOString(),
                role: 'user' as const,
              },
            ],
            lastMessageAt: new Date().toISOString(),
          };
        }
        return room;
      })
    );
  };

  const createRoom = (name: string, participants: string[]): ChatRoom => {
    const newRoom: ChatRoom = {
      id: `room_${Date.now()}`,
      name,
      participants,
      status: 'active',
      messages: [],
      unreadCount: 0,
      lastMessageAt: new Date().toISOString(),
    };
    setRooms((prev) => [...prev, newRoom]);
    return newRoom;
  };

  const markAsRead = (roomId: string) => {
    setRooms((prevRooms) =>
      prevRooms.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room))
    );
  };

  return (
    <ChatContext.Provider value={{ rooms, sendMessage, createRoom, markAsRead }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
