import { createFileRoute } from '@tanstack/react-router';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';

export const Route = createFileRoute('/demo/mobx')({
  component: RouteComponent,
});

class Timer {
  test = {
    a: { title: 't1' },
    b: { title: 't2' },
  };
  secondsPassed = 0;

  constructor() {
    makeAutoObservable(this);
  }

  increaseTimer() {
    this.secondsPassed += 1;
  }

  changeTitle() {
    this.test.a.title = 'new t1';
  }
}

const myTimer = new Timer();

//被`observer`包裹的函数式组件会被监听在它每一次调用前发生的任何变化
const TimerView = observer(({ timer }) => {
  const renderCount = useRef(0);
  renderCount.current++;
  return (
    <div>
      Seconds passed: {timer.secondsPassed} Render Count: {renderCount.current / 2}
    </div>
  );
});
const AView = observer(({ timer }) => {
  const renderCount = useRef(0);
  renderCount.current++;
  return (
    <div>
      A: {timer.test.a.title} Render Count: {renderCount.current / 2}
    </div>
  );
});
const BView = observer(({ timer }) => {
  const renderCount = useRef(0);
  renderCount.current++;
  return (
    <div>
      B: {JSON.stringify(timer.test.a)} Render Count: {renderCount.current / 2}
    </div>
  );
});

function RouteComponent() {
  return (
    <div>
      <button
        aria-label="Increment value"
        onClick={() => myTimer.increaseTimer()}
        className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-green-700 text-white hover:opacity-90 transition-opacity"
      >
        Increment
      </button>
      <button
        aria-label="Increment value"
        onClick={() => {
          myTimer.changeTitle();
          myTimer.changeTitle();
        }}
        className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-green-700 text-white hover:opacity-90 transition-opacity"
      >
        Change Title
      </button>
      <TimerView timer={myTimer} />
      <AView timer={myTimer} />
      <BView timer={myTimer} />
    </div>
  );
}
