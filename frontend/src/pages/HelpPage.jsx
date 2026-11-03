import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser } from '../services/api';

const faqs = [
  {
    category: 'Booking & Scheduling',
    items: [
      { q: 'How do I book an appointment?', a: 'Navigate to "Find a Doctor", select your preferred specialist, choose a date and time, and click "Book Slot". You will receive an instant confirmation.' },
      { q: 'Can I reschedule or cancel my appointment?', a: 'Yes. You can manage your appointments from your Patient Portal. Please cancel at least 24 hours in advance to avoid potential fees.' },
    ]
  },
  {
    category: 'Account & Security',
    items: [
      { q: 'How do I reset my password?', a: 'Click "Log In" then select "Forgot Password". We will send a 6-digit reset code to your registered email address.' },
      { q: 'Is my medical data secure?', a: 'Absolutely. We use industry-standard AES-256 encryption for all sensitive data and strictly adhere to HIPAA compliance standards.' },
    ]
  },
  {
    category: 'Billing & Payments',
    items: [
      { q: 'How much does a consultation cost?', a: 'Consultation fees vary by specialist and are clearly displayed on their profile before you book. Payment is handled directly with the clinic.' },
      { q: 'Do you accept insurance?', a: 'Most of our partner clinics accept major insurance providers. Please contact the clinic directly to verify your specific coverage.' },
    ]
  }
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check auth to determine what the inquiry button says
    getCurrentUser()
      .then((res) => setUser(res.user))
      .catch(() => setUser(null));
  }, []);

  // Filter FAQs based on search input
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    
    const lowerQuery = searchQuery.toLowerCase();
    return faqs.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.q.toLowerCase().includes(lowerQuery) || 
        item.a.toLowerCase().includes(lowerQuery)
      )
    })).filter(group => group.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="bg-surface pb-16">
      {/* Hero Search */}
      <section className="bg-primary py-20 text-center text-on-primary">
        <div className="mx-auto max-w-2xl px-4">
          <h1 className="text-3xl font-semibold sm:text-4xl">How can we help you today?</h1>
          <p className="mt-3 text-primary/80">Search our knowledge base or browse the FAQs below.</p>
          <div className="relative mt-8">
            <span className="material-symbols-outlined absolute left-4 top-3.5 text-on-surface-variant">search</span>
            <input 
              type="text" 
              placeholder="Search for answers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl py-3.5 pl-12 pr-4 text-on-surface shadow-lg outline-none ring-2 ring-transparent transition focus:ring-white/50"
            />
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="mx-auto max-w-4xl px-4 py-16">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-10">
            <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
            <p className="mt-3 text-on-surface-variant">No results found for "{searchQuery}".</p>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredFaqs.map((group) => (
              <div key={group.category}>
                <h2 className="mb-4 text-xl font-semibold text-on-surface">{group.category}</h2>
                <div className="space-y-3">
                  {group.items.map((faq, index) => {
                    const faqId = `${group.category}-${index}`;
                    const isOpen = openFaq === faqId;
                    return (
                      <div key={faqId} className="overflow-hidden rounded-xl border border-slate-200 bg-surface-container-lowest shadow-sm">
                        <button 
                          onClick={() => setOpenFaq(isOpen ? null : faqId)}
                          className="flex w-full items-center justify-between p-5 text-left font-medium text-on-surface hover:bg-surface-container-low transition-colors"
                        >
                          {faq.q}
                          <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            expand_more
                          </span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-100 bg-white p-5 text-sm leading-relaxed text-on-surface-variant">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact / Inquiry Section */}
      <section className="mx-auto max-w-4xl px-4">
        <div className="rounded-3xl bg-surface-container-lowest p-8 text-center shadow-md ring-1 ring-slate-200 sm:p-12">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-3xl">support_agent</span>
          </span>
          <h2 className="mt-6 text-2xl font-semibold text-on-surface">Still need assistance?</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            Our dedicated support team is available to help you with account issues, booking inquiries, and technical support.
          </p>
          
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          
            {user ? (
              <Link 
                to="/patient/support" 
                className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-on-primary shadow-sm transition hover:bg-primary-container"
              >
                Submit an Inquiry
              </Link>
            ) : (
              <Link 
                to="/login" 
                state={{ message: "Please sign in to submit a support inquiry." }} 
                className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-on-primary shadow-sm transition hover:bg-primary-container"
              >
                Log in to submit an inquiry
              </Link>
            )}
            
            <a href="tel:1-800-555-0199" className="rounded-xl border border-slate-200 bg-white px-8 py-3 text-sm font-semibold text-on-surface transition hover:bg-surface-container-low">
              Call 1-800-555-0199
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}