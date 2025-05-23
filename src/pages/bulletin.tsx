import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addMonths } from "date-fns";
import Layout from "@/components/Layout";
import ImageUploadGrid, { UploadedImage } from "@/components/ImageUploadGrid";
import BlurbInput, { CalendarNote } from "@/components/BlurbInput";
import MonthlyTimer from "@/components/MonthlyTimer";
import TypewriterText from "@/components/TypewriterText";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";
import { createNewBulletin } from "@/lib/api";
import { Send, Calendar, Image, FileText, LoaderCircle } from "lucide-react";
// import { useAuth, useSignUp } from "@clerk/clerk-react";
import { Input } from "@/components/ui/input";
import { Dialog } from "@mui/material";

import { useAppDispatch, useAppSelector } from "@/redux";
import { staticGetUser } from "@/redux/user/selectors";
import { setUser } from "@/redux/user";
import { anonhandleSubmitBulletin } from "@/lib/utils";
import axios from "axios";

const Bulletin: React.FC<{ anon?: boolean }> = ({ anon }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const user = useAppSelector(staticGetUser);
  console.log("user", user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [blurb, setBlurb] = useState<string>("");
  const [savedNotes, setSavedNotes] = useState<CalendarNote[]>([]);

  // Custom placeholder for the blurb textarea
  const customPlaceholder =
    "April filled my heart with so much joy. I ordained my best friend's wedding, and everybody laughed and cried (as God and my speech intended). I loved building the bulletin with my best friends all day, every day, when I wasn't working at my big-girl job. !!";

  const handleSubmitBulletin = async () => {
    if (!blurb && images.length === 0) {
      toast.error("Please add some content to your bulletin before submitting");
      return;
    }

    // Validate the number of images
    if (images.length > 4) {
      toast.error("You can only upload up to 4 images");
      return;
    }

    setIsSubmitting(true);

    try {
      toast.loading("Saving your bulletin...");

      // Create a FormData object to properly handle file uploads
      const formData = new FormData();

      // Add the non-file data
      formData.append("user", JSON.stringify(user));
      formData.append("blurb", blurb);
      formData.append("savedNotes", JSON.stringify(savedNotes));
      formData.append("owner", user?.phone_number || "");

      // Process and append each image
      const processedImages = [];

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        console.log("Processing image", image);

        const fetchBlob = await fetch(image.url, {
          method: "GET",
          headers: {
            Accept: "image/png",
          },
        });

        const blob = await fetchBlob.blob();
        console.log("Blob created:", blob);

        // Create a filename for the image
        const filename = `image_${i}_${Date.now()}.png`;

        // Append the actual file to FormData
        formData.append(`images`, blob, filename);

        // Keep track of image metadata
        processedImages.push({
          id: image.id,
          filename: filename,
        });
      }

      // Add image metadata as a JSON string
      formData.append("imageMetadata", JSON.stringify(processedImages));

      // Use FormData with axios
      const response = await axios.post(
        "https://lvwebhookrepo-production.up.railway.app/bulletinCreation",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Response:", response);

      if (response.data.newUserData) {
        dispatch(setUser(response.data.newUserData[0]));
      }

      if (response.data.success) {
        navigate(`/bulletin/${response.data.bulletinId}`);
      } else {
        toast.error("We couldn't save your bulletin. Please try again.");
      }

      toast.dismiss();
      setImages([]);
      setBlurb("");
      setSavedNotes([]);
    } catch (error) {
      console.error("Error saving bulletin:", error);
      toast.error("We couldn't save your bulletin. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log("User:", images);

  const [tempPhoneNumber, setTempPhoneNumber] = useState<string | null>(null);

  return (
    <Layout>
      <div className={`mx-auto ${isMobile ? "px-4 pt-0" : "container py-6"}`}>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-left min-h-[6em]">
            <TypewriterText
              text={`<p>welcome to the bulletin!</p><p>we're happy you're here. ❤️</p><p>upload your pictures, text, and calendar dates below.</p><p>we will gather this content from all your friends, design it beautifully into your bulletin, and ship it to you on may 5th.</p>`}
              speed={isMobile ? 30 : 35}
              className="text-xl"
            />
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {anon && (
                <Input
                  type="text"
                  placeholder="Enter your phone number"
                  value={tempPhoneNumber}
                  onChange={(e) => setTempPhoneNumber(e.target.value)}
                />
              )}
              <BlurbInput
                savedNotes={savedNotes}
                setSavedNotes={setSavedNotes}
                blurb={blurb}
                setBlurb={setBlurb}
                images={images}
                setImages={setImages}
                placeholder={customPlaceholder}
              />
            </div>

            <div className="flex flex-col items-center space-y-8">
              <Button
                onClick={
                  anon
                    ? () => {
                        anonhandleSubmitBulletin(
                          tempPhoneNumber,
                          images,
                          blurb,
                          savedNotes,
                          setIsSubmitting,
                          navigate,
                          dispatch,
                          setImages,
                          setBlurb,
                          setSavedNotes
                        );
                      }
                    : handleSubmitBulletin
                }
                size="lg"
                className="w-full max-w-md bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white shadow-md"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    Saving... <LoaderCircle className="animate-spin" />
                  </span>
                ) : (
                  "Submit your monthly update"
                )}
              </Button>

              <div className="w-full max-w-md">
                <MonthlyTimer />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Bulletin;
