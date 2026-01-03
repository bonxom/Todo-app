import { useNavigate } from 'react-router-dom';

const CTA = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-blue-400 to-purple-700 py-24 px-8">
      {/* Blur spots */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-20 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-10 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      
      <div className="relative cta-container">
        <h2 className="cta-title">Ready to Get Organized?</h2>
        <p className="cta-description">
          Join thousands of users who are already managing their tasks more effectively.
          Start your journey to better productivity today.
        </p>
        <button 
          className="bg-white text-purple-500 font-bold py-4 px-10 rounded-xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-200 hover:scale-105"
          onClick={() => navigate('/register')}
        >
          Start Free Today
        </button>
      </div>
    </section>
  );
};

export default CTA;
