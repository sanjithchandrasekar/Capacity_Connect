import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Don't refetch automatically when switching tabs
    },
    mutations: {
      onError: (error) => {
        // We handle toast notifications in the components usually,
        // but this catches any unhandled mutation errors.
        console.error('Mutation error:', error)
      },
    },
  },
})
