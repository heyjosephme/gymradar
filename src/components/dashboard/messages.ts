import { createContext, useContext } from 'react';
import { en, type Messages } from '@/i18n';

const MessagesContext = createContext<Messages>(en);

export const MessagesProvider = MessagesContext.Provider;

/** The current language's messages. English unless a provider says otherwise. */
export function useMessages(): Messages {
	return useContext(MessagesContext);
}
