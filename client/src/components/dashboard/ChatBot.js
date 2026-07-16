import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, X, Sparkles, SendHorizonal, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import ReactMarkdown from 'react-markdown';

const getRoleLabel = (role) => {
  if (role === 'worker') return 'Worker';
  if (role === 'manager') return 'Manager';
  if (role === 'admin') return 'Admin';
  return 'User';
};

export default function ChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const bottomRef = useRef(null);

  const suggestions = useMemo(() => {
    const role = user?.role || 'worker';
    if (role === 'worker') {
      return [
        'What are my pending tasks?',
        'How is my attendance this month?',
        'What is my trust score?',
        'Do I have any overdue tasks?',
        'What tasks are due today?'
      ];
    }
    if (role === 'manager') {
      return [
        'Which animals are sick?',
        'Who has a low trust score?',
        'What tasks are overdue?',
        'Who checked in today?',
        'Which tasks are high risk?',
        'Give me a farm summary'
      ];
    }
    return [
      'How many users are on the platform?',
      'Give me a platform summary'
    ];
  }, [user?.role]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) setHasUnread(false);
      return next;
    });
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage = { role: 'user', content: trimmed, timestamp: new Date() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    if (!isOpen) setIsOpen(true);

    const history = nextMessages
      .slice(-11, -1)
      .map((message) => ({ role: message.role, content: message.content }));

    try {
      const { data } = await api.post('/ai', { question: trimmed, history });
      const assistantMessage = {
        role: 'assistant',
        content: data.answer || 'Sorry, I could not process that request.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I couldn't process that. Please try again.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
      if (!isOpen) setHasUnread(true);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 1000 }}>
      {!isOpen ? (
        <button
          type="button"
          onClick={toggleOpen}
          aria-label="Open AI Farm Assistant"
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          <MessageCircle size={24} />
          {hasUnread && (
            <span style={{
              position: 'absolute',
              inset: -3,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.65)',
              animation: 'pulse 1.2s infinite'
            }} />
          )}
        </button>
      ) : (
        <div style={{
          width: 360,
          height: 480,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Abariisa AI</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                  {getRoleLabel(user?.role)} assistant
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={clearMessages}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
                aria-label="Clear messages"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={toggleOpen}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
                aria-label="Close AI assistant"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            {messages.length === 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderRadius: 999,
                      border: '1px solid var(--color-border)',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: message.role === 'user' ? '80%' : '85%'
                }}
              >
                <div style={{
                  background: message.role === 'user' ? 'var(--color-primary)' : '#f1f5f9',
                  color: message.role === 'user' ? '#fff' : 'var(--color-text-primary)',
                  borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '0.6rem 0.85rem',
                  fontSize: '0.875rem',
                }}>
                  {message.role === 'user' ? (
                    // User messages — plain text
                    <span>{message.content}</span>
                  ) : (
                    // Assistant messages — render Markdown
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p style={{ margin: '0 0 0.4rem 0', lineHeight: 1.5 }}>{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong style={{ fontWeight: 700 }}>{children}</strong>
                        ),
                        ul: ({ children }) => (
                          <ul style={{ margin: '0.3rem 0', paddingLeft: '1.2rem' }}>{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol style={{ margin: '0.3rem 0', paddingLeft: '1.2rem' }}>{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li style={{ marginBottom: '0.2rem', lineHeight: 1.5 }}>{children}</li>
                        ),
                        h1: ({ children }) => (
                          <p style={{ fontWeight: 700, margin: '0 0 0.3rem 0' }}>{children}</p>
                        ),
                        h2: ({ children }) => (
                          <p style={{ fontWeight: 700, margin: '0 0 0.3rem 0' }}>{children}</p>
                        ),
                        h3: ({ children }) => (
                          <p style={{ fontWeight: 600, margin: '0 0 0.2rem 0' }}>{children}</p>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--color-text-muted)',
                  marginTop: 4
                }}>
                  {message.timestamp
                    ? new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                    : ''}
                </span>
              </div>
            ))}

            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                background: '#f1f5f9',
                color: 'var(--color-text-primary)',
                borderRadius: '16px 16px 16px 4px',
                padding: '0.6rem 0.85rem',
                fontSize: '0.875rem'
              }}>
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{
              borderTop: '1px solid var(--color-border)',
              padding: '0.75rem',
              display: 'flex',
              gap: '0.5rem'
            }}
          >
            <textarea
              rows={1}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend(event);
                }
              }}
              placeholder="Ask about farm data..."
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: '0.6rem 0.75rem',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: 'var(--radius)',
                border: 'none',
                padding: '0.6rem 0.75rem',
                cursor: 'pointer'
              }}
            >
              <SendHorizonal size={16} />
            </button>
          </form>
        </div>
      )}

      <style>
        {'@keyframes pulse { 0% { transform: scale(0.95); opacity: 0.7; } 70% { transform: scale(1.1); opacity: 0.2; } 100% { transform: scale(0.95); opacity: 0.7; } }'}
      </style>
    </div>
  );
}