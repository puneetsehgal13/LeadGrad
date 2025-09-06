import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getQuiz } from "../../lib/courses";

export default function QuizView() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  useEffect(() => {
    (async () => setQuiz(await getQuiz(quizId)))();
  }, [quizId]);
  if (!quiz) return null;
  return (
    <div>
      <h2>{quiz.title}</h2>
      <p>Quiz renderer coming next.</p>
    </div>
  );
}
