import type { Sport } from '@statline/shared';

const exampleSport: Sport = {
  id: '1',
  name: 'Basketball',
  slug: 'basketball',
};

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">StatLine</h1>
        <p className="text-gray-400">Sports prop prediction &amp; line tracking</p>
        <p className="mt-4 text-sm text-gray-500">
          Sport loaded from shared types: <span className="text-indigo-400">{exampleSport.name}</span>
        </p>
      </div>
    </div>
  );
}

export default App;
