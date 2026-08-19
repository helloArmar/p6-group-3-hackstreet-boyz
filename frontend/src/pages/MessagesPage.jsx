import { useEffect, useRef, useState } from 'react';
import { messageApi, tenantApi } from '../api/resources.js';
import { getSocket } from '../api/socket.js';
import useFetch from '../../useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Empty, ErrorState, Loading } from '../components/ui/States.jsx';
import { initials, shortDate, shortTime } from '../../lib.js';

const ACCEPTED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

const attachmentDataUri = (attachment) =>
  `data:${attachment.contentType};base64,${attachment.data}`;

function Attachment({ attachment }) {
  const href = attachmentDataUri(attachment);

  if (attachment.contentType.startsWith('image/')) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        download={attachment.filename}
      >
        <img
          src={href}
          alt={attachment.filename}
          className="mt-1.5 max-w-[220px] max-h-[220px] rounded-lg border border-black/10 object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={attachment.filename}
      className="mt-1.5 flex items-center gap-2 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-xs font-semibold hover:underline"
    >
      <span aria-hidden="true">📎</span> {attachment.filename}
    </a>
  );
}

function ChatThread({
  conversation,
  currentUserId,
  headerTitle,
  headerSubtitle,
}) {
  const conversationKey = conversation.tenant ?? conversation.landlord;
  const messages = useFetch(
    () => messageApi.list(conversation),
    [conversationKey],
  );
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    socket.emit('conversation:join', conversation, (ack) => {
      if (ack && !ack.ok)
        setError(ack.message || 'Could not open this conversation.');
    });

    const onNewMessage = (incoming) => {
      const matches = conversation.tenant
        ? incoming.tenant === conversation.tenant
        : incoming.landlord === conversation.landlord;
      if (!matches) return;

      messages.setData((prev) => {
        const list = prev ?? [];
        if (list.some((m) => m._id === incoming._id)) return list;
        return [...list, incoming];
      });
    };

    socket.on('message:new', onNewMessage);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.emit('conversation:leave', conversation);
    };
  }, [conversationKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.data]);

  const onAttachChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_ATTACHMENT_TYPES.includes(file.type)) {
      setError('Attachments must be a JPG, PNG, GIF, WEBP image, or PDF.');
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError('Attachments must be smaller than 4MB.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result).split(',')[1];

      setAttachment({ filename: file.name, contentType: file.type, data });
    };
    reader.readAsDataURL(file);
  };

  const send = async (event) => {
    event.preventDefault();
    if (!text.trim() && !attachment) return;

    setSending(true);
    setError(null);
    try {
      await messageApi.send({ ...conversation, body: text.trim(), attachment });
      setText('');
      setAttachment(null);
      messages.refetch();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <p className="font-semibold text-slate-800 text-sm">{headerTitle}</p>
        {headerSubtitle && (
          <p className="text-xs text-gray-400">{headerSubtitle}</p>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.loading && <Loading />}
        {messages.error && (
          <ErrorState message={messages.error} onRetry={messages.refetch} />
        )}
        {messages.data && messages.data.length === 0 && (
          <Empty message="No messages yet — say hello." />
        )}
        {messages.data?.map((message) => {
          const mine = message.sender?._id === currentUserId;
          return (
            <div
              key={message._id}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm ${
                  mine ? 'bg-navy text-white' : 'bg-gray-100 text-slate-800'
                }`}
              >
                {!mine && (
                  <p className="text-xs font-semibold mb-0.5 opacity-70">
                    {message.sender?.name}
                  </p>
                )}
                {message.body && (
                  <p className="whitespace-pre-wrap break-words">
                    {message.body}
                  </p>
                )}
                {message.attachment?.data && (
                  <Attachment attachment={message.attachment} />
                )}
                <p
                  className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-gray-400'}`}
                >
                  {shortDate(message.createdAt)} ·{' '}
                  {shortTime(message.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-gray-100 p-3 shrink-0">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        {attachment && (
          <p className="mb-2 text-xs text-brand-green flex items-center gap-2">
            Attached: {attachment.filename}
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="text-gray-400 hover:text-red-600"
              aria-label="Remove attachment"
            >
              ✕
            </button>
          </p>
        )}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={ACCEPTED_ATTACHMENT_TYPES.join(',')}
            onChange={onAttachChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            aria-label="Attach a picture or file"
            title="Attach a picture or file"
          >
            📎
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={sending || (!text.trim() && !attachment)}
            className="shrink-0 px-4 py-2 rounded-md text-sm font-bold text-white bg-navy hover:opacity-90 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ThreadListRow({ active, onClick, avatarLabel, title, preview }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors ${
        active ? 'bg-gray-50' : ''
      }`}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white bg-navy shrink-0">
        {avatarLabel}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">{title}</p>
        <p className="text-xs text-gray-400 truncate">{preview}</p>
      </div>
    </button>
  );
}

const previewText = (lastMessage) =>
  lastMessage
    ? lastMessage.body || (lastMessage.hasAttachment ? '📎 Attachment' : '')
    : 'No messages yet';

export default function MessagesPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const isLandlord = user.role === 'landlord';
  const isTenant = user.role === 'tenant';

  const threads = useFetch(
    () => (isAdmin || isLandlord ? messageApi.threads() : Promise.resolve([])),
    [isAdmin, isLandlord],
  );
  const [activeConversation, setActiveConversation] = useState(null);

  const myTenant = useFetch(
    () => (isTenant ? tenantApi.me() : Promise.resolve(null)),
    [isTenant],
  );

  useEffect(() => {
    if (!isAdmin && !isLandlord) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;

    const onThreadsUpdated = () => threads.refetch();
    socket.on('threads:updated', onThreadsUpdated);
    return () => socket.off('threads:updated', onThreadsUpdated);
  }, [isAdmin, isLandlord]);

  useEffect(() => {
    if (activeConversation || !threads.data) return;
    if (isAdmin && threads.data.length) {
      setActiveConversation({ landlord: threads.data[0].landlord._id });
    } else if (isLandlord) {
      setActiveConversation(
        threads.data.length
          ? { tenant: threads.data[0].tenant._id }
          : { landlord: user._id },
      );
    }
  }, [isAdmin, isLandlord, activeConversation, threads.data, user._id]);

  if (isTenant) {
    return (
      <div className="h-[75vh]">
        {myTenant.loading && <Loading />}
        {myTenant.error && (
          <ErrorState message={myTenant.error} onRetry={myTenant.refetch} />
        )}
        {myTenant.data && (
          <ChatThread
            conversation={{ tenant: myTenant.data._id }}
            currentUserId={user._id}
            headerTitle={
              myTenant.data.landlord?.name ?? 'Your property manager'
            }
            headerSubtitle={myTenant.data.landlord?.email}
          />
        )}
      </div>
    );
  }

  const activeIsAdminThread = activeConversation?.landlord === user._id;
  const activeTenantThread = isLandlord
    ? threads.data?.find((t) => t.tenant._id === activeConversation?.tenant)
    : null;
  const activeLandlordThread = isAdmin
    ? threads.data?.find((t) => t.landlord._id === activeConversation?.landlord)
    : null;

  const headerTitle = isAdmin
    ? (activeLandlordThread?.landlord.name ?? '')
    : activeIsAdminThread
      ? 'Admin'
      : (activeTenantThread?.tenant.name ?? '');

  return (
    <div className="h-[75vh] flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-72 shrink-0 max-h-48 md:max-h-none bg-white border border-gray-200 rounded-lg overflow-y-auto">
        {threads.loading && <Loading />}
        {threads.error && (
          <ErrorState message={threads.error} onRetry={threads.refetch} />
        )}
        {threads.data && threads.data.length === 0 && isAdmin && (
          <Empty message="No property managers to message yet." />
        )}

        {isAdmin &&
          threads.data?.map(({ landlord, lastMessage }) => (
            <ThreadListRow
              key={landlord._id}
              active={activeConversation?.landlord === landlord._id}
              onClick={() => setActiveConversation({ landlord: landlord._id })}
              avatarLabel={initials(landlord.name)}
              title={landlord.name}
              preview={previewText(lastMessage)}
            />
          ))}

        {isLandlord && (
          <>
            <ThreadListRow
              active={activeIsAdminThread}
              onClick={() => setActiveConversation({ landlord: user._id })}
              avatarLabel="A"
              title="Message Admin"
              preview="Questions about your account"
            />
            {threads.data?.map(({ tenant, lastMessage }) => (
              <ThreadListRow
                key={tenant._id}
                active={activeConversation?.tenant === tenant._id}
                onClick={() => setActiveConversation({ tenant: tenant._id })}
                avatarLabel={initials(tenant.name)}
                title={tenant.name}
                preview={previewText(lastMessage)}
              />
            ))}
          </>
        )}
      </div>

      <div className="flex-1 min-w-0 min-h-0">
        {activeConversation ? (
          <ChatThread
            conversation={activeConversation}
            currentUserId={user._id}
            headerTitle={headerTitle}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-white border border-gray-200 rounded-lg text-sm text-gray-400">
            {isAdmin
              ? 'Select a property manager to start chatting.'
              : 'Select a conversation to start chatting.'}
          </div>
        )}
      </div>
    </div>
  );
}
