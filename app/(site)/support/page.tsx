import { BookOpen, HelpCircle, LifeBuoy, Mail, MessageCircle, Phone } from 'lucide-react';

const supportCategories = [
  {
    icon: HelpCircle,
    title: "FAQs",
    description: "Find quick answers to common questions",
    link: "#faqs"
  },
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Detailed guides and tutorials",
    link: "/docs"
  },
  {
    icon: MessageCircle,
    title: "Community",
    description: "Join discussions with other users",
    link: "/community"
  },
  {
    icon: LifeBuoy,
    title: "Technical Support",
    description: "Get help with technical issues",
    link: "#contact"
  }
];

const faqs = [
  {
    question: "How do I download my purchased images?",
    answer: "After purchase, go to your account dashboard and find the 'Downloads' section. Click on the download button next to each image to save it to your device."
  },
  {
    question: "What file formats are available?",
    answer: "Images are available in JPEG and PNG formats. Some images also offer additional formats like RAW or TIFF for extended license holders."
  },
  {
    question: "How do I cancel my subscription?",
    answer: "You can cancel your subscription at any time from your account settings. Navigate to 'Billing' and click 'Cancel Subscription'. Your access will continue until the end of your billing period."
  },
  {
    question: "Can I use images for commercial purposes?",
    answer: "Yes, with the appropriate license. Standard licenses cover most common uses, while Extended licenses are required for merchandise and high-volume applications."
  },
  {
    question: "How do I become a contributor?",
    answer: "Visit our contributor portal to apply. You'll need to submit sample images and pass our quality review process before being approved as a contributor."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept major credit cards, PayPal, and bank transfers for business accounts. All transactions are processed securely through our payment providers."
  }
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="relative py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
              Help & Support
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              We&apos;re here to help you succeed with KlickStock
            </p>
          </div>
        </div>
      </div>

      {/* Support Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {supportCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <a
                key={index}
                href={category.link}
                className="bg-gray-900/60 rounded-2xl p-6 border border-gray-800/50 hover:border-indigo-600/50 transition-colors"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {category.title}
                  </h3>
                  <p className="text-gray-400">
                    {category.description}
                  </p>
                </div>
              </a>
            );
          })}
        </div>

        {/* FAQs */}
        <div className="mt-16" id="faqs">
          <h2 className="text-3xl font-bold text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-900/60 rounded-2xl p-8 border border-gray-800/50">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {faq.question}
                </h3>
                <p className="text-gray-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-16" id="contact">
          <h2 className="text-3xl font-bold text-white mb-8">
            Contact Us
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900/60 rounded-2xl p-8 border border-gray-800/50">
              <div className="flex items-center mb-4">
                <Mail className="h-6 w-6 text-indigo-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Email Support</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Get help via email. We typically respond within 24 hours.
              </p>
              <a
                href="mailto:support@klickstock.com"
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                support@klickstock.com
              </a>
            </div>

            <div className="bg-gray-900/60 rounded-2xl p-8 border border-gray-800/50">
              <div className="flex items-center mb-4">
                <Phone className="h-6 w-6 text-indigo-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Phone Support</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Available Monday to Friday, 9am - 5pm EST
              </p>
              <a
                href="tel:+1-800-123-4567"
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                1-800-123-4567
              </a>
            </div>

            <div className="bg-gray-900/60 rounded-2xl p-8 border border-gray-800/50">
              <div className="flex items-center mb-4">
                <MessageCircle className="h-6 w-6 text-indigo-400 mr-2" />
                <h3 className="text-lg font-semibold text-white">Live Chat</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Chat with our support team in real-time
              </p>
              <button className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                Start Chat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 