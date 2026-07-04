import { createFileRoute } from '@tanstack/react-router';
import { proxy, useSnapshot, snapshot } from 'valtio';
import { useRef } from 'react';

const author = proxy({
  firstName: 'f',
  lastName: 'l',
  books: [{ title: 't1' }, { title: 't2' }],
  test: {
    a: { title: 't1' },
    b: { title: 't2' },
  },
});

const s1 = snapshot(author);
author.books[1].title = 't2b';
author.test.b.title = 't2b';

const s2 = snapshot(author);
console.log(s1 === s2); // false
console.log(s1.books === s2.books); // false
console.log(s1.books[0] === s2.books[0]); // true
console.log(s1.books[1] === s2.books[1]); // false
console.log(s1.test === s2.test); // false
console.log(s1.test.a === s2.test.a); // false
console.log(s1.test.b === s2.test.b); // false

export const Route = createFileRoute('/demo/valtio')({
  component: RouteComponent,
});

const state = proxy({
  books: [
    { id: 1, title: 'b1' },
    { id: 2, title: 'b2' },
  ],
});
const changeTitle = () => {
  state.books[1].title = 'new b2';
};

function BookView({ book }) {
  const renderCount = useRef(0);
  renderCount.current++;
  // book is a snapshot
  return (
    <div>
      {book.title} Render Count: {renderCount.current / 2}
    </div>
  );
}

function AuthorView() {
  const snap = useSnapshot(state);
  const renderCount = useRef(0);
  renderCount.current++;
  return (
    <div>
      <div>AuthorView Render Count: {renderCount.current / 2}</div>
      {snap.books.map((book) => (
        <BookView key={book.id} book={book} />
      ))}
    </div>
  );
}

function RouteComponent() {
  const renderCount = useRef(0);
  renderCount.current++;
  return (
    <div>
      <button
        onClick={changeTitle}
        className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-green-700 text-white hover:opacity-90 transition-opacity"
      >
        Change title
      </button>
      <div>Parent Render Count: {renderCount.current / 2}</div>
      <AuthorView />
    </div>
  );
}
