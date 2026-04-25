import { createFileRoute } from '@tanstack/react-router';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { useSelector, useDispatch, Provider } from 'react-redux';
import type { PayloadAction } from '@reduxjs/toolkit';

interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0,
};

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.value += action.payload;
    },
  },
});

const { increment, decrement } = counterSlice.actions;

const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
type RootState = ReturnType<typeof store.getState>;

export const Route = createFileRoute('/demo/redux')({
  component: () => (
    <Provider store={store}>
      <RouteComponent />
    </Provider>
  ),
});

function Counter() {
  const count = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <div>
      <div>
        <button
          aria-label="Increment value"
          onClick={() => dispatch(increment())}
          className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-green-700 text-white hover:opacity-90 transition-opacity"
        >
          Increment
        </button>
        <span>{count}</span>
        <button
          aria-label="Decrement value"
          onClick={() => dispatch(decrement())}
          className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-red-700 text-white hover:opacity-90 transition-opacity"
        >
          Decrement
        </button>
      </div>
    </div>
  );
}

function RouteComponent() {
  return (
    <div>
      <Counter />
    </div>
  );
}
