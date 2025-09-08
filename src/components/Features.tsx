import { Infinity, ShieldCheck, WifiOff } from "lucide-react";

export const Features = () => {
  const features = [
    {
      icon: <WifiOff className="h-6 w-6 text-primary" />,
      title: "Offline First",
      description: "Work on your diagrams anytime, anywhere, with or without an internet connection.",
    },
    {
      icon: <Infinity className="h-6 w-6 text-primary" />,
      title: "No Limits",
      description: "Create and manage as many diagrams as you need, with no restrictions.",
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
      title: "Your Data is Yours",
      description: "All your data is stored locally on your computer, ensuring complete privacy.",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        {features.map((feature) => (
          <div key={feature.title} className="flex flex-row items-center gap-4 text-left md:flex-col md:text-center p-2">
            <div className="flex-shrink-0 p-2 bg-muted rounded-full">
              {feature.icon}
            </div>
            <div>
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};