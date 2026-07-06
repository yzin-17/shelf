import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/mock', async ({ request }) => {
    const body = await request.json().catch(() => null);

    return HttpResponse.json({
      id: 'abc-123',
      firstName: 'John',
      lastName: 'Maverick',
      received: body,
    });
  }),
];
