import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UserChat from './UserChat';
import AgentClaim from './AgentClaim';

function App() {
  return (
  <Router>
    <div className="min-h-screen bg-gray-200 py-10">
      <Routes>
        {/* דף הבית - הצ'אט של הלקוח */}
        <Route path="/" element={<UserChat />} />
        
        {/* דף הנציג - נפתח מהלינק במייל */}
        <Route path="/agent/:roomId" element={<AgentClaim />} />
      </Routes>
    </div>
  </Router>
);
}

export default App;