import React, { useState } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedPhrases, setExpandedPhrases] = useState({});

  const extractJsonFromMarkdown = (text) => {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return jsonMatch ? jsonMatch[1].trim() : text.trim();
  };

  const togglePhrase = (index) => {
    setExpandedPhrases(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              "role": "system",
              "content": "You are a resume keyword prioritization system that takes in job descriptions and ranks the keywords with a priority score. Return the results as a JSON object."
            },
            {
              "role": "user",
              "content": `Analyze the following job description and provide keyword prioritization as a JSON object. The JSON should have an array called 'keyPhrases' with a maximum of 10 items, where each item is an object with properties: 'phrase' (string), 'priority' (string: HIGH, MEDIUM, or LOW), and 'keywords' (array of objects, each with 'word' and 'score' properties).

Only use language found within the job description. Pay close attention to emphasis words like "must be", "expert in", "strong knowledge", "experience with", etc. A key phrase should be words that are relevant to the job function. A "keyword" should not exceed 3 words. Ensure that tools and technologies are considered as keywords. Prioritize the most important key phrases if there are more than 10.

Job Title: ${jobTitle}

Job Description:
${jobDescription}`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const content = response.data.choices[0].message.content;
      console.log('Raw API response:', content);
      
      const jsonString = extractJsonFromMarkdown(content);
      console.log('Extracted JSON string:', jsonString);
      
      let jsonResult;
      try {
        jsonResult = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.log('Attempted to parse:', jsonString);
        throw new Error('Failed to parse JSON response');
      }
      
      setResults(jsonResult);
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      setResults({ error: 'An error occurred while processing your request. Please check the console for more details.' });
    }
    setIsLoading(false);
  };

  return (
    <div className="container mt-5">
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="jobTitle" className="form-label">Title</label>
          <input
            type="text"
            className="form-control"
            id="jobTitle"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="jobDescription" className="form-label">Job Description</label>
          <textarea
            className="form-control"
            id="jobDescription"
            rows="6"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            required
          />
        </div>
        <div className="text-end">
          <button type="submit" className="btn btn-dark" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Submit'}
          </button>
        </div>
      </form>
      {results && (
        <div className="mt-5">
          <h3>Results:</h3>
          {results.error ? (
            <p className="text-danger">{results.error}</p>
          ) : (
            <div>
              {results.keyPhrases.map((keyPhrase, index) => (
                <div key={index} className="keyphrase-container mb-3">
                  <div 
                    className={`keyphrase-header ${expandedPhrases[index] ? 'expanded' : ''}`}
                    onClick={() => togglePhrase(index)}
                  >
                    <span className="expand-icon">{expandedPhrases[index] ? '−' : '+'}</span>
                    {keyPhrase.phrase} ({keyPhrase.priority})
                  </div>
                  {expandedPhrases[index] && (
                    <div className="keyphrase-keywords">
                      {keyPhrase.keywords.map((keyword, kidx) => (
                        <span key={kidx} className="keyword">
                          {keyword.word} ({keyword.score})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;