@b2bonboarding 
Feature: Chorus B2B Onboarding

@b2bonboarding-scenario1
Scenario: B2B Onboarding Approved - Positive Scenario

  Given the user login to the Chorus Portal
  When they Search for the Work Item created
  Then they Open the Work Item and then Lock it
  Then they check the company name and registration number and Submit
  Then the System validate the company name and registration number, and generate a message if conditions are met
  Then they open the work item and review the questionnaire to ensure all details are captured correctly
  Then they Select Accept and Click the Submit button to proceed with Comments


@b2bonboarding-scenario2
Scenario: B2B Onboarding Approved with Comments - Positive Scenario

  Given the user login to the Chorus Portal
  When they Search for the Work Item created
  Then they Open the Work Item and then Lock it
  Then they check the company name and registration number and Submit
  Then the System validate the company name and registration number, and generate a message if conditions are met
  Then they open the work item and review the questionnaire to ensure all details are captured correctly
  Then they Select Accept and Click the Submit button to proceed with Comments
  Then the system displays the alert to indicate that the case has legal issues and customer wants to proceed further


@b2bonboarding-scenario3
Scenario: B2B Onboarding Rejected - Negative Scenario

  Given the user login to the Chorus Portal
  When they Search for the Work Item created
  Then they Open the Work Item and then Lock it
  Then they check the company name and registration number and Submit
  Then the System validate the company name and registration number, and generate a message if conditions are met
  Then they open the work item and review the questionnaire to ensure all details are captured correctly
  Then they Select Reject and Click the Submit button with Comments

