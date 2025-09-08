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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 text-center">
        {features.map((feature) => (
          <div key={feature.title} className="flex flex-col items-center p-2 md:p-4">
            {feature.icon}
            <h3 className="mt-2 md:mt-4 text-base md:text-lg font-semibold">{feature.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};