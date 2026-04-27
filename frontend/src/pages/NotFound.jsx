import { Link } from "react-router-dom";
import { ArrowLeft, SearchX } from "lucide-react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="section-container py-16 sm:py-24">
        <Card className="max-w-lg mx-auto p-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mx-auto">
            <SearchX className="size-10 text-primary" />
          </div>
          <h1 className="font-display text-4xl text-text-primary">
            Page not found
          </h1>
          <p className="text-text-secondary text-lg max-w-sm mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/">
            <Button size="lg">
              <ArrowLeft className="size-5" />
              Back to home
            </Button>
          </Link>
        </Card>
      </section>
    </main>
  );
}
