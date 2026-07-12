

import Header from "../components/header";


export default function About() {
  return (
    <>
     <Header />
      <div className="pt-24 pb-20 max-w-7xl mx-auto px-6">
        <h1 className="text-6xl font-bold text-center mb-12">About Tukaatu Express</h1>

        <div className="prose max-w-3xl mx-auto text-lg text-gray-600 space-y-8">
          <p>
            Tukaatu Express is a modern courier and logistics company based in Nepal. 
            We are committed to providing fast, reliable, and technology-driven delivery solutions 
            for individuals and businesses across the country.
          </p>
          <p>
            Our mission is to simplify logistics in Nepal by combining local knowledge with 
            modern technology — offering real-time tracking, Cash on Delivery (COD), and a 
            powerful merchant dashboard.
          </p>

          <div className="grid md:grid-cols-2 gap-12 mt-16">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Our Vision</h3>
              <p>To become the most trusted and efficient delivery partner in Nepal.</p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4">Our Values</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Reliability</li>
                <li>Transparency</li>
                <li>Customer Focus</li>
                <li>Innovation</li>
                <li>Speed</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}