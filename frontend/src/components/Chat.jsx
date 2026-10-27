import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

function mergeMessages(previous, incoming) {
  const messages = new Map();

  for (const message of [...previous, ...incoming]) {
    messages.set(message._id, message);
  }

  return [...messages.values()].sort(
    (a, b) =>
      new Date(a.createdAt) - new Date(b.createdAt) ||
      a._id.localeCompare(b._id)
  );
}

function ChatThread({ conversationId }) {
  const { user, token } = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [ready, setReady] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const pendingRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let historyController;

    const socket = io(
      import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
      {
        autoConnect: false,
        auth: { token },
      }
    );

    socketRef.current = socket;

    const connect = () => {
      const currentGeneration = ++generation;

      setReady(false);
      setError('');
      historyController?.abort();
      historyController = new AbortController();
      const controller = historyController;

      socket.timeout(10000).emit(
        'join_room',
        conversationId,
        async (timeoutError, response) => {
          if (disposed || currentGeneration !== generation) return;

          if (timeoutError || !response?.ok) {
            setError(response?.error || 'Could not join the conversation.');
            return;
          }

          setCanWrite(response.canWrite);

          try {
            const result = await api.get(
              `/chat/messages/${conversationId}`,
              { signal: controller.signal }
            );

            if (
              !disposed &&
              !controller.signal.aborted &&
              currentGeneration === generation
            ) {
              setMessages((previous) =>
                mergeMessages(previous, result.data)
              );
              setReady(true);
            }
          } catch (err) {
            if (!disposed && !controller.signal.aborted) {
              setError(
                err.response?.data?.error || 'Failed to load chat history.'
              );
            }
          }
        }
      );
    };

    const receive = (message) => {
      if (
        !disposed &&
        message.conversationId === conversationId
      ) {
        setMessages((previous) =>
          mergeMessages(previous, [message])
        );
      }
    };

    const disconnect = () => {
      generation += 1;
      historyController?.abort();

      if (!disposed) setReady(false);
    };

    const connectionError = (err) => {
      if (!disposed) {
        setReady(false);
        setError(err.message || 'Unable to connect to chat.');
      }
    };

    const sessionError = (message) => {
      if (!disposed) {
        setReady(false);
        setError(message);
      }
    };

    socket.on('connect', connect);
    socket.on('receive_message', receive);
    socket.on('disconnect', disconnect);
    socket.on('connect_error', connectionError);
    socket.on('session_error', sessionError);

    socket.connect();

    return () => {
      disposed = true;
      generation += 1;
      historyController?.abort();

      if (socket.connected) {
        socket.emit('leave_room', conversationId);
      }

      socket.off('connect', connect);
      socket.off('receive_message', receive);
      socket.off('disconnect', disconnect);
      socket.off('connect_error', connectionError);
      socket.off('session_error', sessionError);
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [conversationId, token]);

  const sendMessage = (event) => {
    event.preventDefault();

    const socket = socketRef.current;
    const message = text.trim();

    if (
      !socket?.connected ||
      !ready ||
      !canWrite ||
      sendingRef.current ||
      !message
    ) {
      return;
    }

    if (message.length > 2000) {
      setError('Messages must contain no more than 2,000 characters.');
      return;
    }

    // Preserve the ID for an unchanged retry after a lost acknowledgement.
    if (pendingRef.current?.message !== message) {
      pendingRef.current = {
        message,
        clientMessageId: crypto.randomUUID(),
      };
    }

    sendingRef.current = true;
    setSending(true);
    setError('');

    socket.timeout(10000).emit(
      'send_message',
      {
        conversationId,
        ...pendingRef.current,
      },
      (timeoutError, response) => {
        if (socketRef.current !== socket) return;

        sendingRef.current = false;
        setSending(false);

        if (timeoutError || !response?.ok) {
          setError(
            response?.error ||
              'No confirmation received. Retry the same message to avoid duplicates.'
          );
          return;
        }

        setMessages((previous) =>
          mergeMessages(previous, [response.message])
        );

        pendingRef.current = null;
        setText('');
      }
    );
  };

  return (
    <>
      <div className="border-b px-3 py-2 text-xs text-gray-600">
        {ready
          ? canWrite
            ? 'Connected · Private conversation'
            : 'Read-only · This gig is closed'
          : 'Not ready · Connecting or loading history'}
        <p>Loads the latest 200 messages when connected.</p>
      </div>

      {error && (
        <p role="alert" className="bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div
        role="log"
        aria-label="Conversation messages"
        className="flex h-64 flex-col gap-3 overflow-y-auto bg-gray-50 p-3"
      >
        {ready && messages.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            Start the conversation.
          </p>
        )}

        {messages.map((message) => {
          const mine = message.senderId === user.id;

          return (
            <div
              key={message._id}
              className={`flex flex-col ${
                mine ? 'items-end' : 'items-start'
              }`}
            >
              <span className="mb-1 text-xs text-gray-500">
                {message.author} ·{' '}
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>

              <p
                className={`max-w-[90%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                  mine
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {message.message}
              </p>
            </div>
          );
        })}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2 border-t p-2">
        <input
          aria-label="Message"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={2000}
          disabled={!ready || !canWrite || sending}
          placeholder="Type a message..."
          className="min-w-0 flex-1 rounded border p-2 text-sm"
        />

        <button
          type="submit"
          disabled={!ready || !canWrite || sending || !text.trim()}
          className="rounded bg-blue-600 px-3 text-sm text-white disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </>
  );
}

export default function Chat({ gig, onClose }) {
  const { user } = useAuth();
  const isOwner = gig.posterId?._id === user.id;

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadConversations() {
      try {
        const response = await api.get(`/chat/gigs/${gig._id}`, {
          signal: controller.signal,
        });

        let items = response.data;

        if (
          !controller.signal.aborted &&
          !isOwner &&
          items.length === 0 &&
          gig.status === 'open'
        ) {
          const created = await api.post(
            `/chat/gigs/${gig._id}`,
            {},
            { signal: controller.signal }
          );

          items = [created.data];
        }

        if (!controller.signal.aborted) {
          setConversations(items);
          setSelectedId(items[0]?._id || '');
          setError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err.response?.data?.error || 'Failed to load conversations.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadConversations();

    return () => controller.abort();
  }, [gig._id, gig.status, isOwner, reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError('');
    setReloadKey((value) => value + 1);
  };

  return (
    <aside
      aria-label={`Chat for ${gig.title}`}
      className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border bg-white shadow-2xl"
    >
      <header className="flex items-center justify-between gap-3 bg-blue-600 p-3 text-white">
        <h2 className="truncate text-sm font-bold">{gig.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="text-xl"
        >
          ×
        </button>
      </header>

      <div className="flex items-center gap-2 border-b p-2">
        <span className="flex-1 text-xs text-gray-600">
          {isOwner ? 'Student conversations' : 'Conversation with gig owner'}
        </span>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="text-xs text-blue-700 underline disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p role="status" className="p-4 text-sm">Loading conversations...</p>
      ) : error ? (
        <p role="alert" className="p-4 text-sm text-red-700">{error}</p>
      ) : conversations.length === 0 ? (
        <p className="p-4 text-sm text-gray-600">
          {isOwner
            ? 'No student conversations yet. Refresh after a student starts one.'
            : 'No existing conversation. New chats can only start on open gigs.'}
        </p>
      ) : (
        <>
          {isOwner && (
            <label className="block p-2 text-xs">
              Student
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="mt-1 block w-full rounded border p-2 text-sm"
              >
                {conversations.map((conversation) => (
                  <option key={conversation._id} value={conversation._id}>
                    {conversation.studentId?.name || 'Student'}
                    {' · '}
                    {conversation._id.slice(-6)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selectedId && (
            <ChatThread
              key={selectedId}
              conversationId={selectedId}
            />
          )}
        </>
      )}
    </aside>
  );
}